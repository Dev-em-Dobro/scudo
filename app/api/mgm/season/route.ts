import { NextResponse } from 'next/server';

import { isMgmEnabled } from '@/app/lib/featureFlags';
import { getCurrentSeason } from '@/app/lib/mgm/seasons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Snapshot público da temporada ativa (v0.5) — consumido por client
 * components que não enxergam as envs server-only `MGM_BOOST_*`
 * (ex.: badge do menu lateral). Atrás do proxy = exige sessão.
 */
export async function GET() {
    if (!isMgmEnabled()) {
        return NextResponse.json({ active: false as const });
    }

    const season = getCurrentSeason();
    return NextResponse.json({
        active: season.active,
        name: season.name,
        multiplier: season.multiplier,
        endsAt: season.endsAt?.toISOString() ?? null,
    });
}
