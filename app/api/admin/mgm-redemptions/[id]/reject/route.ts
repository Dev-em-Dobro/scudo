import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isMgmAdmin } from '@/app/lib/mgm/adminAuth';
import { adminRejectRedemption } from '@/app/lib/mgm/redemptions';

export const runtime = 'nodejs';

const Schema = z.object({ reason: z.string().min(1).max(280) });

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
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Payload inválido.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { id } = await params;
    const redemption = await adminRejectRedemption(id, parsed.data.reason);
    return NextResponse.json({ ok: true, redemption });
}
