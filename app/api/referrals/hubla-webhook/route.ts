import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isMgmEnabled } from '@/app/lib/featureFlags';
import { recordReferral } from '@/app/lib/mgm/recordReferral';

export const runtime = 'nodejs';

/**
 * Adapter Hubla → handler central (`recordReferral`). Spec v0.4 §v0.4-H.
 *
 * Responsabilidade DESTE arquivo: validar secret Hubla, parse Zod do payload
 * Hubla, mapear pro shape normalizado. NADA de lógica de negócio aqui —
 * idempotência, validações, atribuição P1/P2 e RLS são do `recordReferral`.
 */

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
    // O ref pode chegar em qualquer um destes (a Hubla decide — spec §4.4):
    utm: z.object({ content: z.string().optional() }).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    query: z.record(z.string(), z.string()).optional(),
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

/** P1: extrai o ref de query/metadata/utm, nesta ordem de confiança. */
function extractHublaRef(payload: HublaWebhook): string | null {
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

export async function POST(request: NextRequest) {
    const auth = isAuthorized(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    if (!isMgmEnabled()) {
        return NextResponse.json({ ok: true, skipped: 'mgm_disabled' });
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

    const result = await recordReferral({
        gateway: 'hubla',
        event: data.event,
        orderId: data.orderId,
        customer: {
            email: data.customer.email,
            phone: data.customer.phone ?? null,
            name: data.customer.name ?? null,
        },
        amount: data.amount,
        ref: extractHublaRef(data),
        createdAt: data.createdAt ?? null,
    });

    return NextResponse.json(result);
}
