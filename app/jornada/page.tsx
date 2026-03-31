import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import JornadaBoard from '@/app/components/jornada/JornadaBoard';
import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { getUserJornadaSnapshot, isOfficialStudentUser } from '@/app/lib/jornada/service';

export default async function JornadaPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const isOfficialStudent = await isOfficialStudentUser(session.user.id);
    if (!isOfficialStudent) {
        redirect('/');
    }

    const snapshot = await getUserJornadaSnapshot(session.user.id);

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Jornada do aluno" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">
                    <section data-onboarding-id="jornada-overview" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6">
                        <div className="space-y-1">
                            <h2 className="text-base md:text-lg font-bold text-white">Evolua por ranks antes da candidatura</h2>
                            <p className="text-base text-slate-300">
                                A Jornada organiza seu progresso em etapas práticas para você ganhar consistência antes de se candidatar.
                            </p>
                            <p className="text-sm text-slate-300">
                                Conclua as tarefas do rank atual para desbloquear o próximo nível.
                            </p>
                        </div>
                    </section>

                    <div data-onboarding-id="jornada-board">
                        <JornadaBoard
                            stages={snapshot.stages}
                            tasks={snapshot.tasks}
                            editableStageId={snapshot.editableStageId}
                            initialCurrentRankLetter={snapshot.currentRankLetter}
                            initialCodeQuestProgress={snapshot.codeQuestProgress}
                            hasCodeQuestAccount={snapshot.hasCodeQuestAccount}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
