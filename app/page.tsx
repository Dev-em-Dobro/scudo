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
import { getOrCreateUserProfile } from './lib/profile/profile';

function calculateJobFit(requiredSkills: string[], knownTechnologies: string[]) {
    if (requiredSkills.length === 0) {
        return 0;
    }

    const normalizedKnownTech = new Set(knownTechnologies.map((skill) => skill.toLowerCase().trim()));
    const normalizedRequiredSkills = [...new Set(requiredSkills.map((skill) => skill.toLowerCase().trim()).filter(Boolean))];

    if (normalizedRequiredSkills.length === 0) {
        return 0;
    }

    const matchedSkills = normalizedRequiredSkills.filter((skill) => normalizedKnownTech.has(skill));
    return Math.round((matchedSkills.length / normalizedRequiredSkills.length) * 100);
}

export default async function Home() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const jobs = await getJobBoardJobs();
    const profile = await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    const aptJobs = jobs
        .map((job) => ({
            job,
            fitPercentage: calculateJobFit(job.stack, profile.knownTechnologies),
        }))
        .filter(({ job, fitPercentage }) => job.stack.length > 0 && fitPercentage >= 50)
        .sort((left, right) => {
            if (right.fitPercentage !== left.fitPercentage) {
                return right.fitPercentage - left.fitPercentage;
            }

            const rightDate = right.job.publishedAt ?? right.job.createdAt;
            const leftDate = left.job.publishedAt ?? left.job.createdAt;
            return rightDate.getTime() - leftDate.getTime();
        })
        .slice(0, 3)
        .map(({ job }) => job);

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Meu Painel" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-8 scrollbar-modern">
                    {/* Intro */}
                    <div>
                        <p className="text-sm text-slate-400 dark:text-slate-300">
                            Aqui está um resumo do seu progresso na Scudo.
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

                        {/* Right column — Apt Jobs */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white">Vagas Aptas para Você</h2>
                                <a href="/jobs" className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
                                    Ver todas
                                </a>
                            </div>
                            {aptJobs.map((job) => (
                                <CuratedJobCard key={job.id} job={job} />
                            ))}
                            {aptJobs.length === 0 && (
                                <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 text-sm text-slate-400 dark:text-slate-300">
                                    Nenhuma vaga apta no momento. Atualize suas skills para ampliar a compatibilidade.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

