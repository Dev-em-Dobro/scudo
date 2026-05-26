'use client';

import { useState } from 'react';

import type { MgmReferralView } from '@/app/lib/mgm/service';
import type { MgmRewardView } from '@/app/lib/mgm/rewards';
import type { MgmRedemptionView, ShippingInfo } from '@/app/lib/mgm/redemptions';
import type { RankingResult } from '@/app/lib/mgm/ranking';
import IndicacaoTab from '@/app/indique-e-ganhe/components/IndicacaoTab';
import PremiosTab from '@/app/indique-e-ganhe/components/PremiosTab';
import RankingTab from '@/app/indique-e-ganhe/components/RankingTab';
import { MGM_PURPLE } from '@/app/indique-e-ganhe/components/theme';

interface IndiqueGanheTabsProps {
    readonly code: string;
    readonly shareLink: string;
    readonly referrals: readonly MgmReferralView[];
    readonly boostActive: boolean;
    readonly boostMultiplier: number;
    readonly seasonName: string | null;
    readonly rewards: readonly MgmRewardView[];
    readonly redemptions: readonly MgmRedemptionView[];
    readonly pointsAvailable: number;
    readonly savedAddress: ShippingInfo | null;
    readonly rankingAllTime: RankingResult;
    readonly rankingSeason: RankingResult | null;
    readonly viewerOptIn: boolean;
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
    boostMultiplier,
    seasonName,
    rewards,
    redemptions,
    pointsAvailable,
    savedAddress,
    rankingAllTime,
    rankingSeason,
    viewerOptIn,
}: IndiqueGanheTabsProps) {
    const [active, setActive] = useState<TabId>('indicacao');

    return (
        <div className="space-y-5">
            <div
                role="tablist"
                aria-label="Seções do programa Indique e Ganhe"
                className="flex gap-6 border-b border-border-light dark:border-border-dark"
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
                            style={
                                isActive
                                    ? { color: MGM_PURPLE, borderColor: MGM_PURPLE }
                                    : undefined
                            }
                            className={`group inline-flex items-center gap-2 pb-3 -mb-px border-b-2 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                                isActive
                                    ? ''
                                    : 'border-transparent text-slate-500 hover:text-slate-200'
                            }`}
                        >
                            <span
                                className="material-symbols-outlined text-[19px] transition-transform duration-200 group-hover:-translate-y-px"
                                style={{
                                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                }}
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
                        boostMultiplier={boostMultiplier}
                        seasonName={seasonName}
                    />
                ) : null}
                {active === 'premios' ? (
                    <PremiosTab
                        rewards={rewards}
                        redemptions={redemptions}
                        pointsAvailable={pointsAvailable}
                        savedAddress={savedAddress}
                    />
                ) : null}
                {active === 'ranking' ? (
                    <RankingTab
                        rankingAllTime={rankingAllTime}
                        rankingSeason={rankingSeason}
                        viewerOptIn={viewerOptIn}
                    />
                ) : null}
            </div>
        </div>
    );
}
