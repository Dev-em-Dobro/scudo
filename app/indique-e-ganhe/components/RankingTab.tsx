'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { RankingEntry, RankingResult } from '@/app/lib/mgm/ranking';
import { MGM_PURPLE, MGM_PURPLE_SOFT, PANEL_SHADOW } from '@/app/indique-e-ganhe/components/theme';

interface RankingTabProps {
    readonly rankingAllTime: RankingResult;
    readonly rankingSeason: RankingResult | null; // null fora de temporada
    readonly viewerOptIn: boolean;
}

export default function RankingTab({
    rankingAllTime,
    rankingSeason,
    viewerOptIn,
}: RankingTabProps) {
    const router = useRouter();
    const seasonAvailable = rankingSeason !== null;
    const [scope, setScope] = useState<'all-time' | 'season'>(
        seasonAvailable ? 'season' : 'all-time',
    );
    const [optIn, setOptIn] = useState(viewerOptIn);
    const [, startTransition] = useTransition();

    const current = scope === 'season' && rankingSeason ? rankingSeason : rankingAllTime;

    async function toggleOptIn() {
        const next = !optIn;
        setOptIn(next);
        try {
            await fetch('/api/mgm/ranking-opt-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ optIn: next }),
            });
            startTransition(() => router.refresh());
        } catch (err) {
            console.error(err);
            setOptIn(!next); // revert
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div
                    className="inline-flex rounded-lg border border-border-light dark:border-border-dark p-1 bg-white dark:bg-surface-dark"
                    role="tablist"
                    style={{ boxShadow: PANEL_SHADOW }}
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={scope === 'season'}
                        disabled={!seasonAvailable}
                        onClick={() => setScope('season')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        style={
                            scope === 'season'
                                ? { backgroundColor: MGM_PURPLE_SOFT, color: MGM_PURPLE }
                                : { color: '#94a3b8' }
                        }
                    >
                        {seasonAvailable ? (rankingSeason!.seasonName ?? 'Temporada') : 'Sem temporada ativa'}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={scope === 'all-time'}
                        onClick={() => setScope('all-time')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                        style={
                            scope === 'all-time'
                                ? { backgroundColor: MGM_PURPLE_SOFT, color: MGM_PURPLE }
                                : { color: '#94a3b8' }
                        }
                    >
                        All-time
                    </button>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={optIn}
                        onChange={toggleOptIn}
                        className="h-4 w-4 rounded accent-violet-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">Aparecer no ranking público</span>
                </label>
            </div>

            <div
                className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark overflow-hidden"
                style={{ boxShadow: PANEL_SHADOW }}
            >
                {current.entries.length === 0 ? (
                    <div className="p-10 flex flex-col items-center text-center">
                        <span
                            className="flex h-14 w-14 items-center justify-center rounded-xl"
                            style={{ backgroundColor: MGM_PURPLE_SOFT }}
                        >
                            <span
                                className="material-symbols-outlined text-[28px]"
                                style={{ fontVariationSettings: "'FILL' 1", color: MGM_PURPLE }}
                            >
                                leaderboard
                            </span>
                        </span>
                        <p className="mt-4 text-sm text-slate-400 max-w-[42ch]">
                            Ninguém pontuou ainda neste recorte. Compartilhe seu link e
                            seja o primeiro a aparecer aqui.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border-light dark:divide-border-dark">
                        {current.entries.map((entry) => (
                            <RankingRow
                                key={entry.userId}
                                entry={entry}
                                isViewer={current.viewerEntry?.userId === entry.userId}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Posição do viewer fora do top */}
            {current.viewerEntry &&
                current.viewerRank &&
                current.viewerRank > current.entries.length && (
                    <div
                        className="rounded-2xl border-2 bg-white dark:bg-surface-dark overflow-hidden"
                        style={{
                            borderColor: MGM_PURPLE,
                            boxShadow: PANEL_SHADOW,
                        }}
                    >
                        <RankingRow entry={current.viewerEntry} isViewer />
                    </div>
                )}

            <p className="text-xs text-slate-500 leading-relaxed">
                Ranking conta indicações válidas e em apuração (dentro da garantia 15d).
                Pontos em apuração podem ser revertidos se o indicado reembolsar.
            </p>
        </div>
    );
}

interface RankingRowProps {
    readonly entry: RankingEntry;
    readonly isViewer: boolean;
}

function RankingRow({ entry, isViewer }: RankingRowProps) {
    const rankIcon =
        entry.rank === 1
            ? { glyph: 'emoji_events', color: '#fbbf24' }
            : entry.rank === 2
              ? { glyph: 'workspace_premium', color: '#cbd5e1' }
              : entry.rank === 3
                ? { glyph: 'workspace_premium', color: '#fb923c' }
                : null;

    return (
        <li
            className="px-5 py-3.5 flex items-center gap-4"
            style={isViewer ? { backgroundColor: MGM_PURPLE_SOFT } : undefined}
        >
            <span className="w-8 text-center shrink-0">
                {rankIcon ? (
                    <span
                        className="material-symbols-outlined text-[22px]"
                        style={{ fontVariationSettings: "'FILL' 1", color: rankIcon.color }}
                    >
                        {rankIcon.glyph}
                    </span>
                ) : (
                    <span className="text-sm font-bold tabular-nums text-slate-400">
                        {entry.rank}
                    </span>
                )}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                    {entry.displayName}
                    {isViewer && (
                        <span
                            className="ml-2 text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: MGM_PURPLE, color: '#fff' }}
                        >
                            Você
                        </span>
                    )}
                </p>
                <p className="text-xs text-slate-500">
                    {entry.referralsCount}{' '}
                    {entry.referralsCount === 1 ? 'indicação' : 'indicações'}
                </p>
            </div>
            <p className="text-sm font-bold tabular-nums shrink-0" style={{ color: MGM_PURPLE }}>
                {entry.pointsTotal} pts
            </p>
        </li>
    );
}
