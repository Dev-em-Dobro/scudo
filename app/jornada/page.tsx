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

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 scrollbar-modern">
                    <JornadaBoard
                        stages={snapshot.stages}
                        tasks={snapshot.tasks}
                        editableStageId={snapshot.editableStageId}
                        initialCurrentRankLetter={snapshot.currentRankLetter}
                        initialLevel={snapshot.level}
                    />
                </div>
            </main>
        </div>
    );
}
