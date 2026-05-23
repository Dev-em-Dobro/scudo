import type { PaymentGateway } from '@prisma/client';
import { NextResponse } from 'next/server';

import { withRlsUserContext, type RlsTransaction } from '@/app/lib/rls';
import { getGuaranteeDays, getPointsBase, getPointsMultiplier } from '@/app/lib/mgm/seasons';
import { MGM_WEBHOOK_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';

/**
 * Handler central de gravação de referral — gateway-agnóstico (spec v0.4 §v0.4-H).
 *
 * Cada gateway (Hubla, Asaas, Stripe, etc.) tem seu próprio adapter em
 * `app/api/referrals/<gateway>-webhook/route.ts`. O adapter:
 *  1. Valida o secret do gateway
 *  2. Parse Zod do payload específico
 *  3. Mapeia pro shape normalizado abaixo (`NormalizedReferralEvent`)
 *  4. Chama `recordReferral()` — toda lógica de idempotência, atribuição (P1/P2),
 *     validação e RLS vive aqui.
 *
 * Idempotência usa unique composto `(gateway, gatewayOrderId)` — mesmo `orderId`
 * em gateways diferentes não colide.
 */

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

export interface NormalizedReferralCustomer {
    email: string;
    phone?: string | null;
    name?: string | null;
}

export interface NormalizedReferralEvent {
    gateway: PaymentGateway;
    event: 'purchase.approved' | 'purchase.refunded';
    orderId: string;
    customer: NormalizedReferralCustomer;
    /** Valor em REAIS (decimal). Adapter converte se gateway mandar centavos. */
    amount: number;
    /** Ref vindo direto do payload (P1). Null → tenta P2 (match por e-mail). */
    ref?: string | null;
    createdAt?: string | null;
}

export type RecordReferralResult =
    | { ok: true; idempotent: true }
    | { ok: true; recorded: true; invalidReason: string | null }
    | { ok: true; refunded: boolean }
    | { ok: true; skipped: 'no_ref' | 'ref_not_found' };

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseEventDate(value?: string | null): Date {
    if (!value) {
        return new Date();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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

async function handleRefund(
    gateway: PaymentGateway,
    orderId: string,
): Promise<{ ok: true; refunded: boolean }> {
    const updated = await withRlsUserContext(
        MGM_WEBHOOK_RLS_USER_ID,
        async (tx) => {
            const existing = await tx.mgmReferral.findUnique({
                where: { gateway_gatewayOrderId: { gateway, gatewayOrderId: orderId } },
                select: { id: true, status: true },
            });
            if (!existing || existing.status === 'reverted') {
                return false;
            }
            await tx.mgmReferral.update({
                where: { gateway_gatewayOrderId: { gateway, gatewayOrderId: orderId } },
                data: { status: 'reverted' },
            });
            return true;
        },
    );

    return { ok: true, refunded: updated };
}

/**
 * Core: registra uma indicação a partir de um evento normalizado de gateway.
 * Roda atribuição P1→P2, validações, criação ou idempotência.
 */
export async function recordReferral(
    input: NormalizedReferralEvent,
): Promise<RecordReferralResult> {
    if (input.event === 'purchase.refunded') {
        return handleRefund(input.gateway, input.orderId);
    }

    const eventDate = parseEventDate(input.createdAt);
    const pointsBase = getPointsBase();
    const multiplier = getPointsMultiplier(eventDate);
    const pointsEarned = Math.round(pointsBase * multiplier);
    const guaranteeDays = getGuaranteeDays();

    return withRlsUserContext(MGM_WEBHOOK_RLS_USER_ID, async (tx) => {
        // Idempotência primeiro (independe do ref).
        const already = await tx.mgmReferral.findUnique({
            where: {
                gateway_gatewayOrderId: {
                    gateway: input.gateway,
                    gatewayOrderId: input.orderId,
                },
            },
            select: { id: true },
        });
        if (already) {
            return { ok: true as const, idempotent: true as const };
        }

        // P1 → P2
        let ref = input.ref?.trim() || null;
        if (!ref) {
            ref = await matchRefByEmail(tx, input.customer.email);
        }
        if (!ref) {
            return { ok: true as const, skipped: 'no_ref' as const };
        }

        const referrer = await tx.user.findUnique({
            where: { mgmReferralCode: ref },
            select: { id: true, email: true },
        });
        if (!referrer) {
            return { ok: true as const, skipped: 'ref_not_found' as const };
        }

        const invalidReason = await validateReferral({
            tx,
            referrerEmail: referrer.email,
            referredEmail: input.customer.email,
        });

        await tx.mgmReferral.create({
            data: {
                referrerUserId: referrer.id,
                referralCodeUsed: ref,
                referredEmail: input.customer.email,
                referredPhone: input.customer.phone ?? null,
                referredName: input.customer.name ?? null,
                saleAmount: input.amount,
                gateway: input.gateway,
                gatewayOrderId: input.orderId,
                pointsBase,
                pointsMultiplier: multiplier,
                pointsEarned,
                status: invalidReason ? 'invalid' : 'pending',
                invalidReason,
                guaranteeUntil: addDays(eventDate, guaranteeDays),
                signedUpAt: eventDate,
            },
        });

        return { ok: true as const, recorded: true as const, invalidReason };
    });
}

/**
 * Helper pra adapter: serializa o resultado em JSON consistente.
 * Adapters chamam: `return NextResponse.json(await recordReferral(...))`.
 */
export function recordReferralResponse(result: RecordReferralResult) {
    return NextResponse.json(result);
}
