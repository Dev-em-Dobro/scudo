import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isMgmAdmin } from '@/app/lib/mgm/adminAuth';
import { recordReferral } from '@/app/lib/mgm/recordReferral';

export const runtime = 'nodejs';

/**
 * QA-only: simula um webhook de venda sem precisar de pagamento real.
 *
 * Gating defense-in-depth (TODOS precisam estar true):
 *  - `MGM_DEV_TEST_ENABLED=true` na env (default false → endpoint 404)
 *  - Sessão valida
 *  - E-mail do user em `MGM_ADMIN_EMAILS`
 *
 * Em prod com `MGM_DEV_TEST_ENABLED` unset/false, retorna 404 — comportamento
 * idêntico a uma rota que não existe (não vaza existência do endpoint).
 *
 * Uso (curl, autenticado):
 *   curl -X POST https://scudo.devemdobro.com/api/mgm/dev/fake-purchase \
 *     -H "Cookie: better-auth.session_token=..." \
 *     -H "Content-Type: application/json" \
 *     -d '{ "referralCode": "ricardo-47", "customerEmail": "teste@x.com" }'
 */

function isDevTestEnabled(): boolean {
    const raw = process.env.MGM_DEV_TEST_ENABLED?.trim().toLowerCase() ?? '';
    return ['1', 'true', 'yes', 'on'].includes(raw);
}

const Schema = z.object({
    referralCode: z.string().min(1),
    customerEmail: z.email(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    amount: z.number().positive().optional(),
    gateway: z.enum(['hubla', 'asaas', 'stripe', 'other']).optional(),
    event: z.enum(['purchase.approved', 'purchase.refunded']).optional(),
    orderId: z.string().optional(), // override pra testar idempotência
});

export async function POST(request: NextRequest) {
    // Gate 1: env flag
    if (!isDevTestEnabled()) {
        return new NextResponse(null, { status: 404 });
    }

    // Gate 2: feature flag MGM ligada
    if (!isMgmEnabled()) {
        return NextResponse.json({ error: 'MGM desabilitado.' }, { status: 403 });
    }

    // Gate 3: sessão admin
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isMgmAdmin(session.user.email)) {
        return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Payload inválido.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const input = parsed.data;
    const gateway = input.gateway ?? 'hubla';
    const orderId =
        input.orderId ?? `dev-${gateway}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await recordReferral({
        gateway,
        event: input.event ?? 'purchase.approved',
        orderId,
        customer: {
            email: input.customerEmail,
            phone: input.customerPhone ?? null,
            name: input.customerName ?? null,
        },
        amount: input.amount ?? 1297,
        ref: input.referralCode,
        createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
        ok: true,
        synthetic: { gateway, orderId, event: input.event ?? 'purchase.approved' },
        result,
    });
}
