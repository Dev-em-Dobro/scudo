import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isMgmAdmin } from '@/app/lib/mgm/adminAuth';
import { adminUpdateShipping, AdminShippingError } from '@/app/lib/mgm/redemptions';

export const runtime = 'nodejs';

const ShippingSchema = z.object({
    name: z.string().min(1).max(200),
    phone: z.string().max(40).optional(),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(40),
    zip: z.string().min(1).max(30),
    notes: z.string().max(500).optional(),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    if (!isMgmEnabled()) {
        return NextResponse.json({ error: 'MGM desabilitado.' }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isMgmAdmin(session.user.email)) {
        return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = ShippingSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Payload inválido.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { id } = await params;

    try {
        const redemption = await adminUpdateShipping(id, {
            ...parsed.data,
            state: parsed.data.state.toUpperCase(),
        });
        return NextResponse.json({ ok: true, redemption });
    } catch (err) {
        if (err instanceof AdminShippingError) {
            const status = err.code === 'not_found' ? 404 : 409;
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status },
            );
        }
        console.error('[PATCH admin shipping] erro:', err);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
