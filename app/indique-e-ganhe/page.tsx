import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { isOfficialStudentUser } from '@/app/lib/jornada/service';
import {
    getOrCreateReferralCode,
    getStatusCards,
    listReferrals,
} from '@/app/lib/mgm/service';
import { buildShareLink } from '@/app/lib/mgm/share-link';
import { getPointsBase, getPointsMultiplier, isBoostActive } from '@/app/lib/mgm/boost';
import StatusCards from '@/app/indique-e-ganhe/components/StatusCards';
import IndiqueGanheTabs from '@/app/indique-e-ganhe/components/IndiqueGanheTabs';

export const dynamic = 'force-dynamic';

export default async function IndiqueGanhePage() {
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

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">
                    <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6">
                        <div className="space-y-1">
                            <h2 className="text-base md:text-lg font-bold text-white">
                                Indique amigos pro DevQuest e acumule pontos
                            </h2>
                            <p className="text-base text-slate-300">
                                Compartilhe seu link. Quando um amigo compra pelo seu link, você
                                pontua e ele ganha 10% de desconto.
                            </p>
                            {boostActive ? (
                                <p className="text-sm font-semibold text-orange-300">
                                    🔥 Janela turbo ativa: pontos multiplicados por{' '}
                                    {getPointsMultiplier(now)}x até o fim do carrinho.
                                </p>
                            ) : (
                                <p className="text-sm text-slate-400">
                                    Cada indicação válida vale {getPointsBase()} pontos (sujeito a
                                    multiplicador em janelas especiais).
                                </p>
                            )}
                        </div>
                    </section>

                    <StatusCards data={statusCards} />

                    <IndiqueGanheTabs
                        code={code}
                        shareLink={shareLink}
                        referrals={referrals}
                        boostActive={boostActive}
                    />
                </div>
            </main>
        </div>
    );
}
