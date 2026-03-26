import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { getJobBoardJobs } from '@/app/lib/jobs/jobBoard';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';

function normalize(value: string) {
    return value.toLowerCase().trim();
}

export default async function AssessmentsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const [profile, jobs] = await Promise.all([
        getOrCreateUserProfile({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
        }),
        getJobBoardJobs(),
    ]);

    const clientProfile = toClientProfile(profile);
    const knownSet = new Set(clientProfile.knownTechnologies.map(normalize));

    const demandMap = new Map<string, number>();
    for (const job of jobs) {
        const uniqueJobSkills = [...new Set(job.stack.map(normalize))];
        for (const skill of uniqueJobSkills) {
            demandMap.set(skill, (demandMap.get(skill) ?? 0) + 1);
        }
    }

    const demandedSkills = [...demandMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([skill, demand]) => ({
            skill,
            demand,
            mastered: knownSet.has(skill),
        }));

    const topDemanded = demandedSkills.slice(0, 12);
    const topGaps = demandedSkills.filter((item) => !item.mastered).slice(0, 8);
    const masteredDemanded = demandedSkills.filter((item) => item.mastered).length;
    const coverage = demandedSkills.length > 0
        ? Math.round((masteredDemanded / demandedSkills.length) * 100)
        : 0;
    const maxDemand = topDemanded[0]?.demand ?? 1;

    const statCards = [
        {
            key: 'coverage',
            title: 'Cobertura de Skills',
            value: `${coverage}%`,
            description: 'Skills demandadas já dominadas no perfil.',
            icon: 'verified',
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
        },
        {
            key: 'demanded',
            title: 'Skills Demandadas',
            value: String(demandedSkills.length),
            description: 'Competências identificadas nas vagas atuais.',
            icon: 'psychology',
            iconColor: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
        },
        {
            key: 'gaps',
            title: 'Gaps Prioritários',
            value: String(topGaps.length),
            description: 'Skills para evolução imediata.',
            icon: 'trending_up',
            iconColor: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
        },
    ];

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Teste suas Skills" />

                <div data-onboarding-id="assessments-overview" className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">

                    {/* Aviso de funcionalidade em desenvolvimento */}
                    <div data-onboarding-id="assessments-warning" className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                        <span className="material-symbols-outlined text-amber-400 shrink-0" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>info</span>
                        <div>
                            <p className="text-sm font-semibold text-amber-300">Assessments em breve</p>
                            <p className="text-base text-slate-300 mt-0.5">
                                Os testes interativos de habilidades estão em desenvolvimento. Por enquanto, você pode analisar seus gaps com base nas vagas do Job Board.
                            </p>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div data-onboarding-id="assessments-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {statCards.map((card) => (
                            <div
                                key={card.key}
                                className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 flex items-start gap-4"
                            >
                                <div className={`shrink-0 w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                                    <span className={`material-symbols-outlined ${card.iconColor}`} style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                                        {card.icon}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wide">{card.title}</p>
                                    <p className="text-2xl font-bold text-white mt-0.5">{card.value}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-300 mt-1">{card.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Ranking de Skills */}
                    <div data-onboarding-id="assessments-ranking" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Ranking de Skills do Mercado</h2>
                        </div>

                        {topDemanded.length > 0 ? (
                            <div className="space-y-3">
                                {topDemanded.map((item, index) => {
                                    const barWidth = Math.round((item.demand / maxDemand) * 100);
                                    return (
                                        <div key={item.skill} className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-slate-400 dark:text-slate-300 w-5 text-right shrink-0">
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-mono font-medium text-slate-200 uppercase">
                                                        {item.skill}
                                                    </span>
                                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                                        <span className="text-xs text-slate-400 dark:text-slate-300">{item.demand} vagas</span>
                                                        {item.mastered ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30">
                                                                <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                                                {" "}Dominada
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                                                <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                                                                {" "}Gap
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${item.mastered ? 'bg-primary' : 'bg-amber-500/60'}`}
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-500" style={{ fontVariationSettings: "'FILL' 1" }}>psychology_alt</span>
                                <p className="text-sm font-medium text-slate-400 dark:text-slate-300">Ainda não há skills suficientes para análise.</p>
                            </div>
                        )}
                    </div>

                    {/* Plano de Estudo */}
                    <div data-onboarding-id="assessments-study-plan" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-amber-400" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>school</span>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Plano de Estudo Sugerido</h2>
                        </div>

                        {topGaps.length > 0 ? (
                            <div className="space-y-2.5">
                                {topGaps.map((item, index) => (
                                    <div
                                        key={item.skill}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-background-dark hover:border-primary/30 transition-colors"
                                    >
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                                            {index + 1}
                                        </span>
                                        <span className="flex-1 text-sm font-mono font-medium text-slate-200 uppercase">
                                            {item.skill}
                                        </span>
                                        <span className="text-xs text-slate-400 dark:text-slate-300 shrink-0">
                                            {item.demand} {item.demand === 1 ? 'vaga' : 'vagas'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                                <p className="text-sm font-medium text-slate-200">Você está bem alinhado!</p>
                                <p className="text-xs text-slate-400 dark:text-slate-300">Nenhum gap prioritário identificado no recorte atual de vagas.</p>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
