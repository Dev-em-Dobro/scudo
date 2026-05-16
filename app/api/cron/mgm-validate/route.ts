import { NextRequest, NextResponse } from 'next/server';

import { withRlsUserContext } from '@/app/lib/rls';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { MGM_CRON_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';

export const runtime = 'nodejs';

/**
 * Cron diário (spec §5): MgmReferral `pending` → `valid` quando a garantia 7d
 * passou. Auth espelha `app/api/jobs/bootstrap` (CRON_SECRET via Bearer — o
 * Vercel Cron injeta `Authorization: Bearer $CRON_SECRET`). Update sob
 * `withRlsUserContext('system:mgm-cron', …)` (§C-B).
 */
function isAuthorized(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return {
            ok: false as const,
            status: 500,
            message: 'CRON_SECRET não está configurado.',
        };
    }

    const headerSecret = request.headers.get('x-cron-secret');
    const bearerToken = request.headers
        .get('authorization')
        ?.replace('Bearer ', '');

    const ok = [headerSecret, bearerToken].some(
        (value) => Boolean(value) && value === cronSecret,
    );

    if (!ok) {
        return { ok: false as const, status: 401, message: 'Não autorizado.' };
    }

    return { ok: true as const };
}

async function handleValidate(request: NextRequest) {
    const auth = isAuthorized(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    // Feature flag (default OFF): cron inerte em prod até o launch do MGM.
    if (!isMgmEnabled()) {
        return NextResponse.json({ ok: true, skipped: 'mgm_disabled' });
    }

    const validated = await withRlsUserContext(
        MGM_CRON_RLS_USER_ID,
        async (tx) => {
            const result = await tx.mgmReferral.updateMany({
                where: {
                    status: 'pending',
                    guaranteeUntil: { lt: new Date() },
                },
                data: { status: 'valid' },
            });
            return result.count;
        },
    );

    return NextResponse.json({ ok: true, validated });
}

export const GET = handleValidate;
export const POST = handleValidate;
