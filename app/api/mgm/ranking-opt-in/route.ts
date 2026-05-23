import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { setRankingOptIn } from '@/app/lib/mgm/ranking';

export const runtime = 'nodejs';

const Schema = z.object({ optIn: z.boolean() });

export async function POST(request: NextRequest) {
    if (!isMgmEnabled()) {
        return NextResponse.json({ error: 'MGM desabilitado.' }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Payload inválido.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    await setRankingOptIn(session.user.id, parsed.data.optIn);
    return NextResponse.json({ ok: true, optIn: parsed.data.optIn });
}
