import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ResumeExampleCard from './components/dashboard/ResumeExampleCard';
import ResumeUploadCard from './components/dashboard/ResumeUploadCard';
import CandidacyReadinessCard from './components/dashboard/CandidacyReadinessCard';
import CuratedJobCard from './components/dashboard/CuratedJobCard';
import { auth } from './lib/auth';
import { getJobBoardJobs } from './lib/jobs/jobBoard';

export default async function Home() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const jobs = await getJobBoardJobs();
    const recentJobs = jobs.slice(0, 3);

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Dashboard" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-8">
                    {/* Intro */}
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Aqui está um resumo do seu progresso na CareerQuest.
                        </p>
                    </div>

                    {/* Main grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Left / main column */}
                        <div className="xl:col-span-2 space-y-6">
                            <ResumeExampleCard />
                            <ResumeUploadCard />
                            <CandidacyReadinessCard jobs={jobs} />
                        </div>

                        {/* Right column — Recent Jobs */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Vagas Recentes para Você</h2>
                                <a href="/jobs" className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
                                    Ver todas
                                </a>
                            </div>
                            {recentJobs.map((job) => (
                                <CuratedJobCard key={job.id} job={job} />
                            ))}
                            {recentJobs.length === 0 && (
                                <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 text-sm text-slate-500 dark:text-slate-400">
                                    Nenhuma vaga disponível no momento.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

