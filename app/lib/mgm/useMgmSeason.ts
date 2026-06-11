'use client';

import { useEffect, useState } from 'react';

/**
 * Temporada ativa no client (v0.5). As envs `MGM_BOOST_*` são server-only,
 * então client components (Sidebar etc.) leem o snapshot de `/api/mgm/season`.
 * Null enquanto carrega ou em erro — consumidores tratam como "sem temporada"
 * (falha de rede nunca quebra a UI, só esconde o destaque).
 */
export interface MgmSeasonInfo {
    active: boolean;
    name: string | null;
    multiplier: number;
    endsAt: string | null;
}

export function useMgmSeason(): MgmSeasonInfo | null {
    const [season, setSeason] = useState<MgmSeasonInfo | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/mgm/season')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data && typeof data.active === 'boolean') {
                    setSeason(data as MgmSeasonInfo);
                }
            })
            .catch(() => {
                /* sem temporada visível — UI segue normal */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return season;
}
