import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import JornadaBoard from '@/app/components/jornada/JornadaBoard';
import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { syncCurseducaProgressForUser } from '@/app/lib/jornada/curseducaSync';
import { getUserJornadaSnapshot, isOfficialStudentUser } from '@/app/lib/jornada/service';

export default async function JornadaPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    syncCurseducaProgressForUser(session.user.id).catch((error) => {
        console.error('[jornada] Falha ao sincronizar progresso da Curseduca em background.', {
            error: error instanceof Error ? error.message : 'unknown_error',
        });
    });

    const [isOfficialStudent, snapshot] = await Promise.all([
        isOfficialStudentUser(session.user.id),
        getUserJornadaSnapshot(session.user.id),
    ]);

    if (!isOfficialStudent) {
        redirect('/');
    }

    return (
        <div className="min-h-screen flex dark bg-black text-white [font-family:'Ubuntu',Helvetica] antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-black">
                <Header title="Jornada do aluno" />

                <div className="flex-1 overflow-visible lg:overflow-auto scrollbar-modern">
                    <div className="w-full px-6 md:px-8 py-10 md:py-14 space-y-12">
                        {/* HERO */}
                        <section data-onboarding-id="jornada-overview">
                            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                                Jornada do aluno_
                            </span>
                            <h1 className="mt-4 text-3xl md:text-[40px] font-black text-white leading-[1.1] [font-family:'Ubuntu',Helvetica]">
                                Suba de rank até as candidaturas
                            </h1>
                            <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                                Conclua as tarefas do seu rank atual pra desbloquear o próximo.
                            </p>
                        </section>

                        {/* BOARD */}
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
                </div>
            </main>
        </div>
    );
}
