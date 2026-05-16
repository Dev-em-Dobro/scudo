import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withRlsUserContext, type RlsTransaction } from '@/app/lib/rls';
import { getPointsBase, getPointsMultiplier } from '@/app/lib/mgm/boost';
import { MGM_WEBHOOK_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';

export const runtime = 'nodejs';

/**
 * Webhook de venda da Hubla → atribuição MGM (spec §4).
 * Casca espelhada de `app/api/jobs/webhook/route.ts` (NextRequest, isAuthorized,
 * safeParse). Writes sob `withRlsUserContext('system:mgm-webhook', …)` (§C-B).
 *
 * Resiliência (§4.7): `extractRef()` resolve o ref de query/metadata/utm (P1).
 * Sem ref → fallback P2: casa por e-mail com `MgmClick` recente. Sem nada →
 * skip (venda orgânica). P3 (reconciliação CSV) é script à parte.
 *
 * Assunção isolada: `amount` é o valor da venda em REAIS (decimal). Se a Hubla
 * mandar centavos, ajustar só aqui — apuração da Fase 0 é manual de qualquer forma.
 */

const GUARANTEE_DAYS = 7;
const CLICK_MATCH_WINDOW_DAYS = 14;

const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'mailinator.com',
    'guerrillamail.com',
    'tempmail.com',
    'temp-mail.org',
    '10minutemail.com',
    'yopmail.com',
    'trashmail.com',
    'sharklasers.com',
    'getnada.com',
    'dispostable.com',
]);

const customerSchema = z.object({
    email: z.email(),
    phone: z.string().optional(),
    name: z.string().optional(),
});

const HublaWebhookSchema = z.object({
    event: z.enum(['purchase.approved', 'purchase.refunded']),
    orderId: z.string().min(1),
    customer: customerSchema,
    amount: z.number().nonnegative(),
    // O ref pode chegar em qualquer um destes (a Hubla decide — §4.4):
    utm: z.object({ content: z.string().optional() }).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    query: z.record(z.string(), z.string()).optional(),
    // Formato de data da Hubla é incerto — não hard-fail; parse com fallback.
    createdAt: z.string().optional(),
});

type HublaWebhook = z.infer<typeof HublaWebhookSchema>;

function isAuthorized(request: NextRequest) {
    const webhookSecret = process.env.HUBLA_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return {
            ok: false as const,
            status: 500,
            message: 'HUBLA_WEBHOOK_SECRET não está configurado.',
        };
    }

    const providedSecret =
        request.headers.get('x-webhook-secret') ??
        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== webhookSecret) {
        return { ok: false as const, status: 401, message: 'Não autorizado.' };
    }

    return { ok: true as const };
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseEventDate(value?: string): Date {
    if (!value) {
        return new Date();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** P1: extrai o ref de query/metadata/utm, nesta ordem de confiança. */
function extractRef(payload: HublaWebhook): string | null {
    const candidates = [
        payload.query?.ref,
        payload.metadata?.ref,
        payload.utm?.content,
    ];
    for (const candidate of candidates) {
        const value = candidate?.trim();
        if (value) {
            return value;
        }
    }
    return null;
}

/** P2: sem ref no payload → casa por e-mail com MgmClick recente. */
async function matchRefByEmail(
    tx: RlsTransaction,
    email: string,
): Promise<string | null> {
    const since = addDays(new Date(), -CLICK_MATCH_WINDOW_DAYS);
    const click = await tx.mgmClick.findFirst({
        where: {
            referredEmail: { equals: email, mode: 'insensitive' },
            createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        select: { referralCode: true },
    });
    return click?.referralCode ?? null;
}

interface ValidateInput {
    tx: RlsTransaction;
    referrerEmail: string;
    referredEmail: string;
}

/** spec §4.5.1 — retorna invalidReason ou null se válido. */
async function validateReferral({
    tx,
    referrerEmail,
    referredEmail,
}: ValidateInput): Promise<string | null> {
    const referred = referredEmail.toLowerCase().trim();

    if (referred === referrerEmail.toLowerCase().trim()) {
        return 'self_referral';
    }

    const domain = referred.split('@')[1] ?? '';
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        return 'disposable_domain';
    }

    // Já é aluno DevQuest verificado com esse e-mail?
    const existingStudent = await tx.user.findFirst({
        where: {
            email: { equals: referred, mode: 'insensitive' },
            officialStudentVerifiedAt: { not: null },
        },
        select: { id: true },
    });
    if (existingStudent) {
        return 'existing_student';
    }

    // Indicação duplicada (mesmo e-mail já indicado, ainda viva)?
    const duplicate = await tx.mgmReferral.findFirst({
        where: {
            referredEmail: { equals: referred, mode: 'insensitive' },
            status: { in: ['pending', 'valid'] },
        },
        select: { id: true },
    });
    if (duplicate) {
        return 'duplicate';
    }

    return null;
}

async function handleRefund(orderId: string): Promise<NextResponse> {
    const updated = await withRlsUserContext(
        MGM_WEBHOOK_RLS_USER_ID,
        async (tx) => {
            const existing = await tx.mgmReferral.findUnique({
                where: { hublaOrderId: orderId },
                select: { id: true, status: true },
            });
            if (!existing || existing.status === 'reverted') {
                return false;
            }
            await tx.mgmReferral.update({
                where: { hublaOrderId: orderId },
                data: { status: 'reverted' },
            });
            return true;
        },
    );

    return NextResponse.json({ ok: true, refunded: updated });
}

export async function POST(request: NextRequest) {
    const auth = isAuthorized(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const parsed = HublaWebhookSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                error: 'Payload inválido para webhook da Hubla.',
                details: parsed.error.issues,
            },
            { status: 400 },
        );
    }

    const data = parsed.data;

    if (data.event === 'purchase.refunded') {
        return handleRefund(data.orderId);
    }

    const eventDate = parseEventDate(data.createdAt);
    const pointsBase = getPointsBase();
    const multiplier = getPointsMultiplier(eventDate);
    const pointsEarned = Math.round(pointsBase * multiplier);

    const result = await withRlsUserContext(
        MGM_WEBHOOK_RLS_USER_ID,
        async (tx) => {
            // Idempotência primeiro (independe do ref).
            const already = await tx.mgmReferral.findUnique({
                where: { hublaOrderId: data.orderId },
                select: { id: true },
            });
            if (already) {
                return { ok: true, idempotent: true };
            }

            // P1 → P2
            let ref = extractRef(data);
            if (!ref) {
                ref = await matchRefByEmail(tx, data.customer.email);
            }
            if (!ref) {
                return { ok: true, skipped: 'no_ref' as const };
            }

            const referrer = await tx.user.findUnique({
                where: { mgmReferralCode: ref },
                select: { id: true, email: true },
            });
            if (!referrer) {
                return { ok: true, skipped: 'ref_not_found' as const };
            }

            const invalidReason = await validateReferral({
                tx,
                referrerEmail: referrer.email,
                referredEmail: data.customer.email,
            });

            await tx.mgmReferral.create({
                data: {
                    referrerUserId: referrer.id,
                    referralCodeUsed: ref,
                    referredEmail: data.customer.email,
                    referredPhone: data.customer.phone ?? null,
                    referredName: data.customer.name ?? null,
                    saleAmount: data.amount,
                    hublaOrderId: data.orderId,
                    pointsBase,
                    pointsMultiplier: multiplier,
                    pointsEarned,
                    status: invalidReason ? 'invalid' : 'pending',
                    invalidReason,
                    guaranteeUntil: addDays(eventDate, GUARANTEE_DAYS),
                    signedUpAt: eventDate,
                },
            });

            return { ok: true, recorded: true, invalidReason };
        },
    );

    return NextResponse.json(result);
}
