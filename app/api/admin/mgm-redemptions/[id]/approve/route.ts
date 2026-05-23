import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isMgmAdmin } from '@/app/lib/mgm/adminAuth';
import { adminApproveRedemption } from '@/app/lib/mgm/redemptions';

export const runtime = 'nodejs';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    if (!isMgmEnabled()) {
        return NextResponse.json({ error: 'MGM desabilitado.' }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isMgmAdmin(session.user.email)) {
        return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const { id } = await params;
    const redemption = await adminApproveRedemption(id);
    return NextResponse.json({ ok: true, redemption });
}
