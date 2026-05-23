import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isOfficialStudentUser } from '@/app/lib/jornada/service';
import { requestRedemption, RedemptionError } from '@/app/lib/mgm/redemptions';

export const runtime = 'nodejs';

const ShippingInfoSchema = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    notes: z.string().optional(),
});

const RequestSchema = z.object({
    rewardSlug: z.string().min(1),
    shippingInfo: ShippingInfoSchema.optional().nullable(),
});

export async function POST(request: NextRequest) {
    if (!isMgmEnabled()) {
        return NextResponse.json({ error: 'MGM desabilitado.' }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isOfficial = await isOfficialStudentUser(session.user.id);
    if (!isOfficial) {
        return NextResponse.json({ error: 'Apenas alunos oficiais.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Payload inválido.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    try {
        const result = await requestRedemption({
            userId: session.user.id,
            rewardSlug: parsed.data.rewardSlug,
            shippingInfo: parsed.data.shippingInfo ?? null,
        });
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        if (error instanceof RedemptionError) {
            const status =
                error.code === 'reward_not_found'
                    ? 404
                    : error.code === 'insufficient_balance' ||
                        error.code === 'family_already_redeemed'
                      ? 409
                      : 400;
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status },
            );
        }
        console.error('[POST /api/mgm/redemptions] erro inesperado:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
