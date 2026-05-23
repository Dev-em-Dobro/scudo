import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isMgmAdmin } from '@/app/lib/mgm/adminAuth';
import { adminMarkDelivered } from '@/app/lib/mgm/redemptions';

export const runtime = 'nodejs';

const DeliverySchema = z.object({
    deliveryInfo: z.object({
        couponCode: z.string().optional(),
        tracking: z.string().optional(),
        deliveredVia: z.string().optional(),
    }),
});

export async function POST(
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
    const parsed = DeliverySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Payload inválido.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { id } = await params;
    const redemption = await adminMarkDelivered({
        redemptionId: id,
        deliveryInfo: parsed.data.deliveryInfo,
    });
    return NextResponse.json({ ok: true, redemption });
}
