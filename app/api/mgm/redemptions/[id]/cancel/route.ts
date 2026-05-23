import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { cancelRedemption, CancelRedemptionError } from '@/app/lib/mgm/redemptions';

export const runtime = 'nodejs';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    if (!isMgmEnabled()) {
        return NextResponse.json({ error: 'MGM desabilitado.' }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const redemption = await cancelRedemption(session.user.id, id);
        return NextResponse.json({ ok: true, redemption });
    } catch (error) {
        if (error instanceof CancelRedemptionError) {
            const status = error.code === 'not_found' ? 404 : 409;
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status },
            );
        }
        console.error('[POST /api/mgm/redemptions/:id/cancel] erro:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
