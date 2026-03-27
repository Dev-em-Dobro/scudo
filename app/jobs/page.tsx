import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import JobBoardResults from '../components/dashboard/JobBoardResults';
import { auth } from '../lib/auth';
import { getJobBoardJobs } from '../lib/jobs/jobBoard';
import { getUserJornadaSnapshot, isOfficialStudentUser } from '../lib/jornada/service';

export default async function JobsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const jobs = await getJobBoardJobs();
    const isOfficialStudent = await isOfficialStudentUser(session.user.id);
    const jornadaSnapshot = isOfficialStudent ? await getUserJornadaSnapshot(session.user.id) : null;

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Vagas para Você" />

                <div data-onboarding-id="jobs-board" className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 scrollbar-modern">
                    <JobBoardResults
                        jobs={jobs}
                        currentRank={jornadaSnapshot?.currentRankLetter ?? null}
                        isOfficialStudent={isOfficialStudent}
                    />
                </div>
            </main>
        </div>
    );
}
