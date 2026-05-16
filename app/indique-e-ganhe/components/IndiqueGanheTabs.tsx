'use client';

import { useState } from 'react';

import type { MgmReferralView } from '@/app/lib/mgm/service';
import IndicacaoTab from '@/app/indique-e-ganhe/components/IndicacaoTab';
import PremiosTab from '@/app/indique-e-ganhe/components/PremiosTab';
import RankingTab from '@/app/indique-e-ganhe/components/RankingTab';

interface IndiqueGanheTabsProps {
    readonly code: string;
    readonly shareLink: string;
    readonly referrals: readonly MgmReferralView[];
    readonly boostActive: boolean;
}

type TabId = 'indicacao' | 'premios' | 'ranking';

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: string }> = [
    { id: 'indicacao', label: 'Indicação', icon: 'share' },
    { id: 'premios', label: 'Prêmios', icon: 'card_giftcard' },
    { id: 'ranking', label: 'Ranking', icon: 'leaderboard' },
];

export default function IndiqueGanheTabs({
    code,
    shareLink,
    referrals,
    boostActive,
}: IndiqueGanheTabsProps) {
    const [active, setActive] = useState<TabId>('indicacao');

    return (
        <div className="space-y-4">
            <div
                role="tablist"
                aria-label="Seções do programa Indique e Ganhe"
                className="flex gap-1 border-b border-border-light dark:border-border-dark"
            >
                {TABS.map((tab) => {
                    const isActive = tab.id === active;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActive(tab.id)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span
                                className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                {tab.icon}
                            </span>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div role="tabpanel">
                {active === 'indicacao' ? (
                    <IndicacaoTab
                        code={code}
                        shareLink={shareLink}
                        referrals={referrals}
                        boostActive={boostActive}
                    />
                ) : null}
                {active === 'premios' ? <PremiosTab /> : null}
                {active === 'ranking' ? <RankingTab /> : null}
            </div>
        </div>
    );
}
