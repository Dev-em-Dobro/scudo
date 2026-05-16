import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isOfficialStudentUser } from '@/app/lib/jornada/service';
import {
    getOrCreateReferralCode,
    getStatusCards,
    listReferrals,
} from '@/app/lib/mgm/service';
import { buildShareLink } from '@/app/lib/mgm/share-link';
import {
    getGuaranteeDays,
    getPointsBase,
    getPointsMultiplier,
    isBoostActive,
} from '@/app/lib/mgm/boost';
import StatusCards from '@/app/indique-e-ganhe/components/StatusCards';
import IndiqueGanheTabs from '@/app/indique-e-ganhe/components/IndiqueGanheTabs';
import FaqSection from '@/app/indique-e-ganhe/components/FaqSection';
import {
    MGM_PURPLE,
    MGM_PURPLE_LINE,
    MGM_PURPLE_SOFT,
    PANEL_SHADOW,
} from '@/app/indique-e-ganhe/components/theme';

export const dynamic = 'force-dynamic';

export default async function IndiqueGanhePage() {
    // Feature flag (default OFF): rota inerte em prod até o launch do MGM.
    if (!isMgmEnabled()) {
        redirect('/');
    }

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login?callbackUrl=/indique-e-ganhe');
    }

    const isOfficial = await isOfficialStudentUser(session.user.id);
    if (!isOfficial) {
        // C-G (spec v0.3): consistente com app/jornada/page.tsx — sem NotEligiblePage.
        redirect('/');
    }

    const code = await getOrCreateReferralCode(session.user.id, session.user.name);
    const [statusCards, referrals] = await Promise.all([
        getStatusCards(session.user.id),
        listReferrals(session.user.id, { limit: 10 }),
    ]);

    const now = new Date();
    const boostActive = isBoostActive(now);
    const shareLink = buildShareLink(code);

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Indique e Ganhe" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 scrollbar-modern">
                    <div className="mx-auto w-full max-w-5xl space-y-6">
                        <section
                            className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-6 md:p-8"
                            style={{
                                boxShadow: PANEL_SHADOW,
                                borderTop: `2px solid ${MGM_PURPLE_LINE}`,
                            }}
                        >
                            <div className="flex items-start justify-between gap-6">
                                <div className="min-w-0">
                                    <span
                                        className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                                        style={{ color: MGM_PURPLE }}
                                    >
                                        Programa de indicação
                                    </span>
                                    <h2 className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                                        Indique amigos pro DevQuest
                                        <br className="hidden sm:block" /> e acumule pontos
                                    </h2>
                                    <p className="mt-2.5 text-sm md:text-base text-slate-400 leading-relaxed max-w-[54ch]">
                                        Compartilhe seu link. Quando alguém compra pelo seu link,
                                        você pontua e a pessoa ganha 10% de desconto.
                                    </p>

                                    <div className="mt-5">
                                        {boostActive ? (
                                            <span className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                                                <span
                                                    className="material-symbols-outlined text-[18px] text-amber-400"
                                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                                >
                                                    local_fire_department
                                                </span>
                                                <span className="text-xs font-semibold text-amber-300">
                                                    Turbo ativo: {getPointsMultiplier(now)}x pontos
                                                    por indicação
                                                </span>
                                            </span>
                                        ) : (
                                            <span
                                                className="inline-flex items-center gap-2 rounded-lg px-3 py-2"
                                                style={{ backgroundColor: MGM_PURPLE_SOFT }}
                                            >
                                                <span
                                                    className="material-symbols-outlined text-[18px]"
                                                    style={{
                                                        fontVariationSettings: "'FILL' 1",
                                                        color: MGM_PURPLE,
                                                    }}
                                                >
                                                    bolt
                                                </span>
                                                <span
                                                    className="text-xs font-semibold"
                                                    style={{ color: MGM_PURPLE }}
                                                >
                                                    {getPointsBase()} pontos por indicação válida
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <span
                                    className="hidden md:flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
                                    style={{ backgroundColor: MGM_PURPLE_SOFT }}
                                    aria-hidden="true"
                                >
                                    <span
                                        className="material-symbols-outlined text-[44px]"
                                        style={{
                                            fontVariationSettings: "'FILL' 1",
                                            color: MGM_PURPLE,
                                        }}
                                    >
                                        volunteer_activism
                                    </span>
                                </span>
                            </div>
                        </section>

                        <StatusCards data={statusCards} />

                        <IndiqueGanheTabs
                            code={code}
                            shareLink={shareLink}
                            referrals={referrals}
                            boostActive={boostActive}
                        />

                        <FaqSection
                            pointsBase={getPointsBase()}
                            guaranteeDays={getGuaranteeDays()}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
