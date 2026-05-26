'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { RankingEntry, RankingResult } from '@/app/lib/mgm/ranking';
import { MGM_PURPLE } from '@/app/indique-e-ganhe/components/theme';

interface RankingTabProps {
    readonly rankingAllTime: RankingResult;
    readonly rankingSeason: RankingResult | null;
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
            setOptIn(!next);
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="inline-flex rounded-lg border border-[#333] bg-[#1a1a1a] p-1" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={scope === 'season'}
                        disabled={!seasonAvailable}
                        onClick={() => setScope('season')}
                        className={`text-[12px] font-bold uppercase tracking-[1.5px] px-4 py-2 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [font-family:'Ubuntu',Helvetica] ${
                            scope === 'season' ? 'bg-[#6528d3] text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        {seasonAvailable ? (rankingSeason!.seasonName ?? 'Temporada') : 'Sem temporada'}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={scope === 'all-time'}
                        onClick={() => setScope('all-time')}
                        className={`text-[12px] font-bold uppercase tracking-[1.5px] px-4 py-2 rounded-md transition-colors cursor-pointer [font-family:'Ubuntu',Helvetica] ${
                            scope === 'all-time' ? 'bg-[#6528d3] text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        All-time
                    </button>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={optIn}
                        onChange={toggleOptIn}
                        className="h-4 w-4 rounded accent-[#6528d3] cursor-pointer"
                    />
                    <span className="text-[13px] text-white/70 [font-family:'Ubuntu',Helvetica]">
                        Aparecer no ranking público
                    </span>
                </label>
            </div>

            <div className="rounded-2xl border border-[#333] bg-[#1a1a1a] overflow-hidden">
                {current.entries.length === 0 ? (
                    <div className="p-12 flex flex-col items-center text-center">
                        <p className="text-[16px] font-bold text-white [font-family:'Ubuntu',Helvetica]">
                            Ninguém pontuou ainda
                        </p>
                        <p className="mt-2 text-[14px] text-white/60 max-w-[44ch] leading-relaxed [font-family:'Ubuntu',Helvetica]">
                            Compartilhe seu link e seja o primeiro a aparecer aqui.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-[#333]">
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

            {current.viewerEntry &&
                current.viewerRank &&
                current.viewerRank > current.entries.length && (
                    <div className="rounded-2xl border-2 border-[#6528d3] bg-[#1a1a1a] overflow-hidden">
                        <RankingRow entry={current.viewerEntry} isViewer />
                    </div>
                )}

            <p className="text-[13px] text-white/50 leading-relaxed [font-family:'Ubuntu',Helvetica]">
                Ranking conta indicações válidas e em apuração (dentro da garantia de 15d). Pontos
                em apuração podem ser revertidos se o indicado solicitar reembolso.
            </p>
        </div>
    );
}

interface RankingRowProps {
    readonly entry: RankingEntry;
    readonly isViewer: boolean;
}

function RankingRow({ entry, isViewer }: RankingRowProps) {
    const rankColor =
        entry.rank === 1
            ? '#ff6b35'
            : entry.rank === 2
              ? '#94a3b8'
              : entry.rank === 3
                ? '#fb923c'
                : null;

    return (
        <li
            className="px-6 py-4 flex items-center gap-5"
            style={isViewer ? { backgroundColor: 'rgba(101, 40, 211, 0.08)' } : undefined}
        >
            <span className="w-10 text-center shrink-0">
                <span
                    className="text-[18px] font-black tabular-nums [font-family:'Ubuntu',Helvetica]"
                    style={{ color: rankColor ?? 'rgba(255,255,255,0.5)' }}
                >
                    {entry.rank}
                </span>
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white truncate [font-family:'Ubuntu',Helvetica]">
                    {entry.displayName}
                    {isViewer && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-[1.5px] px-2 py-0.5 rounded bg-[#6528d3] text-white">
                            Você
                        </span>
                    )}
                </p>
                <p className="text-[12px] text-white/60 [font-family:'Ubuntu',Helvetica]">
                    {entry.referralsCount}{' '}
                    {entry.referralsCount === 1 ? 'indicação' : 'indicações'}
                </p>
            </div>
            <p
                className="text-[16px] font-black tabular-nums shrink-0 [font-family:'Ubuntu',Helvetica]"
                style={{ color: MGM_PURPLE }}
            >
                {entry.pointsTotal} pts
            </p>
        </li>
    );
}
