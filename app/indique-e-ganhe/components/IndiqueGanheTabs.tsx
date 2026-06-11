'use client';

import { useState } from 'react';

import type { MgmReferralView } from '@/app/lib/mgm/service';
import type { MgmRewardView } from '@/app/lib/mgm/rewards';
import type { MgmRedemptionView, ShippingInfo } from '@/app/lib/mgm/redemptions';
import type { RankingResult } from '@/app/lib/mgm/ranking';
import IndicacaoTab from '@/app/indique-e-ganhe/components/IndicacaoTab';
import PremiosTab from '@/app/indique-e-ganhe/components/PremiosTab';
import RankingTab from '@/app/indique-e-ganhe/components/RankingTab';

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
    readonly seasonEndsAt: string | null;
    readonly rankingAllTime: RankingResult;
    readonly rankingSeason: RankingResult | null;
    readonly viewerOptIn: boolean;
}

type TabId = 'indicacao' | 'premios' | 'ranking';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
    { id: 'indicacao', label: 'Indicação' },
    { id: 'premios', label: 'Prêmios' },
    { id: 'ranking', label: 'Ranking' },
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
    seasonEndsAt,
    rankingAllTime,
    rankingSeason,
    viewerOptIn,
}: IndiqueGanheTabsProps) {
    const [active, setActive] = useState<TabId>('indicacao');

    return (
        <div className="space-y-8">
            <div
                role="tablist"
                aria-label="Seções do programa Indique e Ganhe"
                className="flex gap-8 border-b border-[#333]"
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
                            className={`pb-4 -mb-px border-b-2 text-[12px] font-bold uppercase tracking-[2px] transition-colors duration-200 cursor-pointer [font-family:'Ubuntu',Helvetica] ${
                                isActive
                                    ? 'border-[#6528d3] text-white'
                                    : 'border-transparent text-white/50 hover:text-white'
                            }`}
                        >
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
                        seasonEndsAt={seasonEndsAt}
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
