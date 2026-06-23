import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isOfficialStudentUser } from '@/app/lib/jornada/service';
import {
    getOrCreateReferralCode,
    getStatusCards,
    listReferrals,
} from '@/app/lib/mgm/service';
import { buildShareLink } from '@/app/lib/mgm/share-link';
import {
    getCurrentSeason,
    getGuaranteeDays,
    getPointsBase,
    getPointsMultiplier,
    getSeasonName,
    isSeasonActive,
} from '@/app/lib/mgm/seasons';
import { listActiveRewards } from '@/app/lib/mgm/rewards';
import { listRedemptions, type ShippingInfo } from '@/app/lib/mgm/redemptions';
import { getRanking } from '@/app/lib/mgm/ranking';
import StatusCards from '@/app/indique-e-ganhe/components/StatusCards';
import IndiqueGanheTabs from '@/app/indique-e-ganhe/components/IndiqueGanheTabs';
import FaqSection from '@/app/indique-e-ganhe/components/FaqSection';
import Image from 'next/image';
import bannerCopa from '@/app/assets/banner-copa.webp';

export const dynamic = 'force-dynamic';

export default async function IndiqueGanhePage() {
    if (!isMgmEnabled()) {
        redirect('/');
    }

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login?callbackUrl=/indique-e-ganhe');
    }

    const isOfficial = await isOfficialStudentUser(session.user.id);
    if (!isOfficial) {
        redirect('/');
    }

    const code = await getOrCreateReferralCode(session.user.id, session.user.name);

    const now = new Date();
    const boostActive = isSeasonActive(now);
    const seasonName = getSeasonName();
    // v0.5: prêmio da temporada mostra a data-limite de resgate no card.
    const seasonEndsAt = boostActive
        ? (getCurrentSeason(now).endsAt?.toISOString() ?? null)
        : null;
    const shareLink = buildShareLink(code);

    const [statusCards, referrals, rewards, redemptions, rankingAllTime, rankingSeason, profile] =
        await Promise.all([
            getStatusCards(session.user.id),
            listReferrals(session.user.id, { limit: 10 }),
            listActiveRewards(session.user.id),
            listRedemptions(session.user.id, { limit: 20 }),
            getRanking(session.user.id, { scope: 'all-time', limit: 10 }),
            boostActive
                ? getRanking(session.user.id, { scope: 'season', limit: 10 })
                : Promise.resolve(null),
            prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                select: { mgmShippingAddress: true },
            }),
        ]);

    const userMeta = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { mgmRankingOptIn: true },
    });
    const viewerOptIn = userMeta?.mgmRankingOptIn ?? true;
    const savedAddress = (profile?.mgmShippingAddress as unknown as ShippingInfo | null) ?? null;

    const pointsBase = getPointsBase();
    const guaranteeDays = getGuaranteeDays();
    const boostMultiplier = getPointsMultiplier(now);

    return (
        <div className="min-h-screen flex dark bg-black text-white [font-family:'Ubuntu',Helvetica] antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-black">
                <Header title="Indique e Ganhe" />

                <div className="flex-1 overflow-visible lg:overflow-auto scrollbar-modern">
                    <div className="w-full px-6 md:px-8 py-10 md:py-14 space-y-12">
                        {/* BANNER DA TEMPORADA (v0.5) — arte oficial da Copa */}
                        {boostActive && (
                            <Image
                                src={bannerCopa}
                                alt="Temporada Copa DevQuest — Indique & Ganhe: 1.5x pontos nas indicações, 600 pts = R$ 500 no PIX, 300 pts = camiseta exclusiva. Até 24 de julho de 2026."
                                priority
                                unoptimized
                                className="w-full h-auto rounded-2xl border border-[#ff6b35]/30"
                            />
                        )}

                        {/* HERO */}
                        <section>
                            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                                Programa de indicação_
                            </span>
                            <h1 className="mt-4 text-3xl md:text-[40px] font-black text-white leading-[1.1] [font-family:'Ubuntu',Helvetica]">
                                Indique amigos pro DevQuest
                                <br className="hidden sm:block" /> e acumule pontos
                            </h1>
                            <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                                Compartilhe seu link com quem quer começar a programar. A cada
                                compra feita por ele, você ganha pontos e troca por prêmios.
                            </p>

                            {!boostActive && (
                                <div className="mt-6 inline-flex">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-[#6528d3] px-4 py-2">
                                        <span className="text-[12px] font-bold text-white tracking-wide [font-family:'Ubuntu',Helvetica]">
                                            {pointsBase} PONTOS POR INDICAÇÃO VÁLIDA
                                        </span>
                                    </span>
                                </div>
                            )}
                        </section>

                        {/* TABS */}
                        <IndiqueGanheTabs
                            code={code}
                            shareLink={shareLink}
                            referrals={referrals}
                            boostActive={boostActive}
                            boostMultiplier={boostMultiplier}
                            seasonName={seasonName}
                            rewards={rewards}
                            redemptions={redemptions}
                            pointsAvailable={statusCards.pointsAvailable}
                            savedAddress={savedAddress}
                            seasonEndsAt={seasonEndsAt}
                            rankingAllTime={rankingAllTime}
                            rankingSeason={rankingSeason}
                            viewerOptIn={viewerOptIn}
                        />

                        {/* STATUS */}
                        <section>
                            <h2 className="mb-6 text-[22px] md:text-[26px] font-black text-white leading-tight [font-family:'Ubuntu',Helvetica]">
                                Sua pontuação
                            </h2>
                            <StatusCards data={statusCards} />
                        </section>

                        {/* FAQ */}
                        <FaqSection pointsBase={pointsBase} guaranteeDays={guaranteeDays} />
                    </div>
                </div>
            </main>
        </div>
    );
}
