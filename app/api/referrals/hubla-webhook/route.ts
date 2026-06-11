import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isMgmEnabled } from '@/app/lib/featureFlags';
import { recordReferral } from '@/app/lib/mgm/recordReferral';

export const runtime = 'nodejs';

/**
 * Adapter Hubla → handler central (`recordReferral`). Spec v0.4 §v0.4-H.
 *
 * Formato: **Webhook Hubla v2.0.0** (docs: hubla.gitbook.io/docs/webhooks).
 * A Hubla autentica enviando o token único da conta no header `x-hubla-token`
 * (não há header customizável) — `HUBLA_WEBHOOK_SECRET` deve ser setado com
 * esse token. `x-webhook-secret`/Bearer continuam aceitos pra testes manuais.
 *
 * Eventos consumidos: `invoice.payment_succeeded` e `invoice.refunded`.
 * Qualquer outro `type` responde 200 `{skipped}` — a Hubla faz retry em
 * não-2xx, e evento não-mapeado não é erro.
 *
 * Responsabilidade DESTE arquivo: validar token, parse Zod do payload Hubla,
 * mapear pro shape normalizado. NADA de lógica de negócio aqui — idempotência,
 * validações, atribuição P1/P2 e RLS são do `recordReferral`.
 */

const personSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
});

const HublaWebhookV2Schema = z.object({
    type: z.enum(['invoice.payment_succeeded', 'invoice.refunded']),
    version: z.string().optional(),
    event: z.object({
        invoice: z.object({
            id: z.string().min(1),
            saleDate: z.string().optional(),
            createdAt: z.string().optional(),
            amount: z.object({ totalCents: z.number().nonnegative() }),
            // utm capturado pela Hubla na sessão de checkout — nosso redirect
            // /i/[code] manda utm_content=<referralCode> (P1).
            firstPaymentSession: z
                .object({
                    utm: z
                        .object({
                            source: z.string().optional(),
                            content: z.string().optional(),
                        })
                        .optional(),
                })
                .optional(),
        }),
        payer: personSchema.optional(),
        user: personSchema.optional(),
    }),
});

type HublaWebhookV2 = z.infer<typeof HublaWebhookV2Schema>;

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
        request.headers.get('x-hubla-token') ??
        request.headers.get('x-webhook-secret') ??
        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== webhookSecret) {
        return { ok: false as const, status: 401, message: 'Não autorizado.' };
    }

    return { ok: true as const };
}

function fullName(person?: z.infer<typeof personSchema>): string | null {
    if (!person) return null;
    const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return name || null;
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

    // Evento não-mapeado (assinatura na Hubla pode incluir outros types) →
    // 200 pra não entrar em retry; logamos pra visibilidade.
    const typeProbe = z.object({ type: z.string() }).safeParse(body);
    if (
        typeProbe.success &&
        !['invoice.payment_succeeded', 'invoice.refunded'].includes(typeProbe.data.type)
    ) {
        console.warn('[mgm/hubla-webhook] Evento ignorado.', { type: typeProbe.data.type });
        return NextResponse.json({ ok: true, skipped: 'unhandled_event' });
    }

    const parsed = HublaWebhookV2Schema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                error: 'Payload inválido para webhook da Hubla (v2).',
                details: parsed.error.issues,
            },
            { status: 400 },
        );
    }

    const data: HublaWebhookV2 = parsed.data;
    const { invoice } = data.event;

    // Comprador: `payer` é quem pagou; fallback `user` (titular do acesso).
    const customer = data.event.payer?.email ? data.event.payer : data.event.user;
    if (!customer?.email) {
        return NextResponse.json(
            { error: 'Payload sem e-mail do comprador (payer/user).' },
            { status: 400 },
        );
    }

    const result = await recordReferral({
        gateway: 'hubla',
        event:
            data.type === 'invoice.payment_succeeded'
                ? 'purchase.approved'
                : 'purchase.refunded',
        orderId: invoice.id,
        customer: {
            email: customer.email,
            phone: customer.phone ?? null,
            name: fullName(customer),
        },
        // Hubla manda centavos; shape normalizado é em reais.
        amount: invoice.amount.totalCents / 100,
        ref: invoice.firstPaymentSession?.utm?.content?.trim() || null,
        createdAt: invoice.saleDate ?? invoice.createdAt ?? null,
    });

    return NextResponse.json(result);
}
