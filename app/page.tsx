import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ResumeExampleCard from './components/dashboard/ResumeExampleCard';
import ResumeUploadCard from './components/dashboard/ResumeUploadCard';
import CandidacyReadinessCard from './components/dashboard/CandidacyReadinessCard';
import AptJobsEmptyHint from './components/home/AptJobsEmptyHint';
import CuratedJobCard from './components/dashboard/CuratedJobCard';
import SeasonHighlightStrip from './components/mgm/SeasonHighlightStrip';
import { auth } from './lib/auth';
import { isMgmEnabled } from './lib/featureFlags';
import { getCurrentSeason } from './lib/mgm/seasons';
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

    // Destaque sutil da temporada MGM (v0.5) — só com flag ligada + janela ativa.
    const season = isMgmEnabled() ? getCurrentSeason() : null;

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
        <div className="min-h-screen flex dark bg-black text-white [font-family:'Ubuntu',Helvetica] antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-black">
                <Header title="Meu Painel" />

                <div className="flex-1 overflow-visible lg:overflow-auto scrollbar-modern">
                    <div className="w-full px-6 md:px-8 py-10 md:py-14 space-y-12">
                        {/* HERO */}
                        <section data-onboarding-id="painel-resumo">
                            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                                Meu painel_
                            </span>
                            <h1 className="mt-4 text-3xl md:text-[40px] font-black text-white leading-[1.1] [font-family:'Ubuntu',Helvetica]">
                                Prepare seu perfil antes das vagas
                            </h1>
                            <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                                Suba seu currículo e mantenha o perfil atualizado pra que o matching das vagas funcione direito.
                            </p>
                        </section>

                        {/* TEMPORADA MGM (v0.5) */}
                        {season?.active && (
                            <SeasonHighlightStrip
                                seasonName={season.name}
                                multiplier={season.multiplier}
                                endsAt={season.endsAt?.toISOString() ?? null}
                            />
                        )}

                        {/* Main grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2 space-y-6">
                                <div data-onboarding-id="painel-modelo-curriculo">
                                    <ResumeExampleCard />
                                </div>
                                <div data-onboarding-id="painel-curriculo">
                                    <ResumeUploadCard />
                                </div>
                                <div data-onboarding-id="painel-aptidao">
                                    <CandidacyReadinessCard jobs={jobs} />
                                </div>
                            </div>

                            <div className="space-y-4" data-onboarding-id="painel-vagas-aptas">
                                <div className="flex items-end justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                                        Vagas pra você_
                                    </span>
                                    <a href="/jobs" className="text-[12px] font-bold text-[#a78bfa] hover:text-white transition-colors [font-family:'Ubuntu',Helvetica]">
                                        Ver todas →
                                    </a>
                                </div>
                                {aptJobs.map((job) => (
                                    <CuratedJobCard key={job.id} job={job} />
                                ))}
                                {aptJobs.length === 0 && (
                                    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 text-sm text-white/70">
                                        <AptJobsEmptyHint />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

