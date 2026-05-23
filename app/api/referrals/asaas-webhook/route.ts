import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isMgmEnabled } from '@/app/lib/featureFlags';
import { recordReferral } from '@/app/lib/mgm/recordReferral';

export const runtime = 'nodejs';

/**
 * Adapter Asaas → handler central (`recordReferral`). Spec v0.4 §v0.4-H.
 *
 * Configurar no painel da Asaas (Settings → Integrações → Webhooks):
 *  - URL: https://scudo.devemdobro.com/api/referrals/asaas-webhook
 *  - Eventos: PAYMENT_CONFIRMED, PAYMENT_REFUNDED
 *  - Token (header asaas-access-token): valor de `ASAAS_WEBHOOK_SECRET`
 *
 * Mapeamento Asaas → normalizado:
 *  - event: PAYMENT_CONFIRMED → purchase.approved
 *  - event: PAYMENT_REFUNDED → purchase.refunded
 *  - payment.id → orderId
 *  - payment.customer (email/mobilePhone/name) → customer
 *  - payment.value (Asaas já manda em REAIS decimal) → amount
 *  - payment.externalReference (se cadastrarmos link com ?ref=) → ref
 *  - payment.dateCreated → createdAt
 */

const AsaasCustomerSchema = z.object({
    email: z.email(),
    mobilePhone: z.string().optional(),
    phone: z.string().optional(),
    name: z.string().optional(),
});

const AsaasPaymentSchema = z.object({
    id: z.string().min(1),
    value: z.number().nonnegative(),
    dateCreated: z.string().optional(),
    /** Asaas inclui ref via externalReference do link/cobrança. */
    externalReference: z.string().optional().nullable(),
    customer: AsaasCustomerSchema,
});

const AsaasWebhookSchema = z.object({
    event: z.enum(['PAYMENT_CONFIRMED', 'PAYMENT_REFUNDED']),
    payment: AsaasPaymentSchema,
});

function isAuthorized(request: NextRequest) {
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return {
            ok: false as const,
            status: 500,
            message: 'ASAAS_WEBHOOK_SECRET não está configurado.',
        };
    }

    const providedSecret =
        request.headers.get('asaas-access-token') ??
        request.headers.get('x-webhook-secret') ??
        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== webhookSecret) {
        return { ok: false as const, status: 401, message: 'Não autorizado.' };
    }

    return { ok: true as const };
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
    const parsed = AsaasWebhookSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                error: 'Payload inválido para webhook da Asaas.',
                details: parsed.error.issues,
            },
            { status: 400 },
        );
    }

    const { event, payment } = parsed.data;

    const result = await recordReferral({
        gateway: 'asaas',
        event: event === 'PAYMENT_CONFIRMED' ? 'purchase.approved' : 'purchase.refunded',
        orderId: payment.id,
        customer: {
            email: payment.customer.email,
            phone: payment.customer.mobilePhone ?? payment.customer.phone ?? null,
            name: payment.customer.name ?? null,
        },
        amount: payment.value,
        ref: payment.externalReference ?? null,
        createdAt: payment.dateCreated ?? null,
    });

    return NextResponse.json(result);
}
