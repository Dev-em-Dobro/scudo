import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { getAllAvailableJobs, getJobBoardJobs } from '@/app/lib/jobs/jobBoard';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';

function normalize(value: string) {
    return value.toLowerCase().trim();
}

function detectWorkModel(location: string | null, isRemote: boolean) {
    const text = normalize(location ?? '');

    if (isRemote || /remoto|remote|home\s?office/.test(text)) {
        return 'Remoto';
    }

    if (/h[ií]brido|hybrid/.test(text)) {
        return 'Híbrido';
    }

    return 'Presencial';
}

function SectionBlock({
    title,
    icon,
    iconColor,
    children,
}: Readonly<{ title: string; icon: string; iconColor: string; children: React.ReactNode }>) {
    return (
        <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
                <span
                    className={`material-symbols-outlined ${iconColor}`}
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                >
                    {icon}
                </span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function DistributionBar({
    label,
    value,
    total,
    colorClass,
    bgClass,
}: Readonly<{ label: string; value: number; total: number; colorClass: string; bgClass: string }>) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-300 w-24 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bgClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-sm font-bold ${colorClass} w-8 text-right shrink-0`}>{value}</span>
            <span className="text-xs text-slate-400 dark:text-slate-300 w-9 shrink-0">{pct}%</span>
        </div>
    );
}

type AnalyticsJob = Awaited<ReturnType<typeof getAllAvailableJobs>>[number];

type GeneralStats = {
    totalJobs: number;
    workModelCounts: {
        Remoto: number;
        Híbrido: number;
        Presencial: number;
    };
    levelCounts: {
        ESTAGIO: number;
        JUNIOR: number;
        PLENO: number;
        SENIOR: number;
        OUTRO: number;
    };
};

type FitStats = {
    hasSkills: boolean;
    avgFit: number;
    highFitJobs: number;
    mediumFitJobs: number;
    lowFitJobs: number;
    evaluableCount: number;
};

type SkillDemandStats = {
    demandedSkills: Array<{
        skill: string;
        demand: number;
        mastered: boolean;
    }>;
    topDemanded: Array<{
        skill: string;
        demand: number;
        mastered: boolean;
    }>;
    topGaps: Array<{
        skill: string;
        demand: number;
        mastered: boolean;
    }>;
    coverage: number;
    maxDemand: number;
};

function buildGeneralStats(jobs: AnalyticsJob[]): GeneralStats {
    const workModelCounts = { Remoto: 0, Híbrido: 0, Presencial: 0 };
    const levelCounts = { ESTAGIO: 0, JUNIOR: 0, PLENO: 0, SENIOR: 0, OUTRO: 0 };

    for (const job of jobs) {
        const workModel = detectWorkModel(job.location, job.isRemote);
        workModelCounts[workModel] += 1;
        levelCounts[job.level] += 1;
    }

    return {
        totalJobs: jobs.length,
        workModelCounts,
        levelCounts,
    };
}

function buildFitStats(jobs: AnalyticsJob[], knownTechnologies: string[]): FitStats {
    const knownSet = new Set(knownTechnologies.map(normalize));
    const hasSkills = knownSet.size > 0;
    const evaluableJobs = jobs.filter((job) => job.stack.length > 0);

    const fitScores = hasSkills
        ? evaluableJobs.map((job) => {
            const requiredSkills = [...new Set(job.stack.map(normalize))];
            const matched = requiredSkills.filter((skill) => knownSet.has(skill)).length;
            return Math.round((matched / requiredSkills.length) * 100);
        })
        : [];

    const avgFit = fitScores.length > 0
        ? Math.round(fitScores.reduce((acc, value) => acc + value, 0) / fitScores.length)
        : 0;

    return {
        hasSkills,
        avgFit,
        highFitJobs: fitScores.filter((value) => value >= 70).length,
        mediumFitJobs: fitScores.filter((value) => value >= 50 && value < 70).length,
        lowFitJobs: fitScores.filter((value) => value < 50).length,
        evaluableCount: evaluableJobs.length,
    };
}

function getAvgFitVisual(avgFit: number) {
    if (avgFit >= 70) {
        return {
            color: 'text-primary',
            iconBg: 'bg-primary/10',
        };
    }

    if (avgFit >= 50) {
        return {
            color: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
        };
    }

    return {
        color: 'text-red-400',
        iconBg: 'bg-red-500/10',
    };
}

function buildSkillDemandStats(jobs: AnalyticsJob[], knownTechnologies: string[]): SkillDemandStats {
    const knownSet = new Set(knownTechnologies.map(normalize));
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

    return {
        demandedSkills,
        topDemanded,
        topGaps,
        coverage,
        maxDemand: topDemanded[0]?.demand ?? 1,
    };
}

// SONAR: pagina agrega multiplas secoes e variacoes de renderizacao; refatoracao em componentes menores sera feita em tarefa dedicada.
export default async function AnalyticsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const [profile, allJobs, filteredJobs] = await Promise.all([
        getOrCreateUserProfile({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
        }),
        getAllAvailableJobs(),
        getJobBoardJobs(),
    ]);

    const clientProfile = toClientProfile(profile);
    const generalStats = buildGeneralStats(allJobs);
    const fitStats = buildFitStats(filteredJobs, clientProfile.knownTechnologies);
    const skillDemandStats = buildSkillDemandStats(filteredJobs, clientProfile.knownTechnologies);
    const avgFitVisual = getAvgFitVisual(fitStats.avgFit);

    const statCards = [
        {
            key: 'total',
            title: 'Vagas disponíveis',
            value: String(generalStats.totalJobs),
            description: 'Total geral de vagas disponíveis na base.',
            icon: 'work',
            iconColor: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
        },
        {
            key: 'fit',
            title: 'Compatibilidade Média',
            value: fitStats.hasSkills ? `${fitStats.avgFit}%` : '—',
            description: fitStats.hasSkills
                ? `Compatibilidade média em ${fitStats.evaluableCount} vagas do recorte analisado.`
                : 'Adicione habilidades ao perfil.',
            icon: 'target',
            iconColor: fitStats.hasSkills ? avgFitVisual.color : 'text-slate-400',
            iconBg: fitStats.hasSkills ? avgFitVisual.iconBg : 'bg-slate-500/10',
        },
        {
            key: 'high',
            title: 'Alta Compat.',
            value: fitStats.hasSkills ? String(fitStats.highFitJobs) : '—',
            description: fitStats.hasSkills ? 'Vagas analisadas com compatibilidade ≥ 70%.' : 'Adicione habilidades ao perfil.',
            icon: 'verified',
            iconColor: fitStats.hasSkills ? 'text-primary' : 'text-slate-400',
            iconBg: fitStats.hasSkills ? 'bg-primary/10' : 'bg-slate-500/10',
        },
        {
            key: 'low',
            title: 'Baixa Compat.',
            value: fitStats.hasSkills ? String(fitStats.lowFitJobs) : '—',
            description: fitStats.hasSkills ? 'Vagas analisadas com compatibilidade abaixo de 50%.' : 'Adicione habilidades ao perfil.',
            icon: 'trending_down',
            iconColor: fitStats.hasSkills ? 'text-red-400' : 'text-slate-400',
            iconBg: fitStats.hasSkills ? 'bg-red-500/10' : 'bg-slate-500/10',
        },
    ];

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Radar de Mercado" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">
                    <section data-onboarding-id="analytics-overview" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                                >
                                    insights
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-base md:text-lg font-bold text-white">Pare de adivinhar: veja o que o mercado realmente pede.</h2>
                                <p className="text-base text-slate-300">
                                    Acompanhe as vagas em alta e ajuste seu perfil com estratégia para aumentar suas chances de contratação.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Stat cards */}
                    <div data-onboarding-id="analytics-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {statCards.map((card) => (
                            <div
                                key={card.key}
                                className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 flex items-start gap-4"
                            >
                                <div className={`shrink-0 w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                                    <span
                                        className={`material-symbols-outlined ${card.iconColor}`}
                                        style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                                    >
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

                    <div data-onboarding-id="analytics-skill-overview" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <span
                                    className="material-symbols-outlined text-amber-400"
                                    style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                                >
                                    school
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-base md:text-lg font-bold text-white">Seu plano de evolução no mercado</h2>
                                <p className="text-base text-slate-300">
                                    Veja as habilidades mais demandadas, seus gaps prioritários e o que estudar primeiro para subir sua compatibilidade.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div data-onboarding-id="analytics-skill-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div data-onboarding-id="analytics-skill-coverage" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 flex items-start gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                                    verified
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wide">Cobertura de Habilidades</p>
                                <p className="text-2xl font-bold text-white mt-0.5">{`${skillDemandStats.coverage}%`}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-300 mt-1">Habilidades demandadas já dominadas no perfil.</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 flex items-start gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                                    psychology
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wide">Habilidades Demandadas</p>
                                <p className="text-2xl font-bold text-white mt-0.5">{String(skillDemandStats.demandedSkills.length)}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-300 mt-1">Competências identificadas nas vagas atuais.</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 flex items-start gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-400" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                                    trending_up
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wide">Gaps Prioritários</p>
                                <p className="text-2xl font-bold text-white mt-0.5">{String(skillDemandStats.topGaps.length)}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-300 mt-1">Habilidades para evolução imediata.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div data-onboarding-id="analytics-skill-ranking" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Ranking de Habilidades do Mercado</h2>
                            </div>

                            {skillDemandStats.topDemanded.length > 0 ? (
                                <div className="space-y-3">
                                    {skillDemandStats.topDemanded.map((item, index) => {
                                        const barWidth = Math.round((item.demand / skillDemandStats.maxDemand) * 100);
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
                                                                    {' '}Dominada
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                                                                    {' '}Gap
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
                                    <p className="text-sm font-medium text-slate-400 dark:text-slate-300">Ainda não há habilidades suficientes para análise.</p>
                                </div>
                            )}
                        </div>

                        <div data-onboarding-id="analytics-study-plan" className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-amber-400" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>school</span>
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Plano de Estudo Sugerido</h2>
                            </div>

                            {skillDemandStats.topGaps.length > 0 ? (
                                <div className="space-y-2.5">
                                    {skillDemandStats.topGaps.map((item, index) => (
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

                    {/* Distribuição por Compatibilidade e Modelo de Trabalho */}
                    <div data-onboarding-id="analytics-fit-model" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SectionBlock title="Distribuição por Compatibilidade" icon="donut_large" iconColor="text-primary">
                            {fitStats.hasSkills ? (
                                <div className="space-y-3">
                                    <DistributionBar
                                        label="Alta (≥70%)"
                                        value={fitStats.highFitJobs}
                                        total={fitStats.evaluableCount}
                                        colorClass="text-primary"
                                        bgClass="bg-primary"
                                    />
                                    <DistributionBar
                                        label="Média (50–69%)"
                                        value={fitStats.mediumFitJobs}
                                        total={fitStats.evaluableCount}
                                        colorClass="text-amber-400"
                                        bgClass="bg-amber-400"
                                    />
                                    <DistributionBar
                                        label="Baixa (<50%)"
                                        value={fitStats.lowFitJobs}
                                        total={fitStats.evaluableCount}
                                        colorClass="text-red-400"
                                        bgClass="bg-red-400"
                                    />
                                    <p className="pt-1 text-xs text-slate-400 dark:text-slate-300">
                                        Adendo: a compatibilidade considera apenas o recorte técnico do Radar (fontes, senioridade e stack mapeada).
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 dark:text-slate-300">
                                    Faça upload do seu currículo ou adicione suas habilidades no perfil para ver a distribuição de compatibilidade.
                                </p>
                            )}
                        </SectionBlock>

                        <SectionBlock title="Modelo de Trabalho" icon="location_on" iconColor="text-blue-400">
                            <div className="space-y-3">
                                <DistributionBar
                                    label="Remoto"
                                    value={generalStats.workModelCounts.Remoto}
                                    total={generalStats.totalJobs}
                                    colorClass="text-primary"
                                    bgClass="bg-primary"
                                />
                                <DistributionBar
                                    label="Híbrido"
                                    value={generalStats.workModelCounts.Híbrido}
                                    total={generalStats.totalJobs}
                                    colorClass="text-blue-400"
                                    bgClass="bg-blue-400"
                                />
                                <DistributionBar
                                    label="Presencial"
                                    value={generalStats.workModelCounts.Presencial}
                                    total={generalStats.totalJobs}
                                    colorClass="text-slate-400"
                                    bgClass="bg-slate-400"
                                />
                            </div>
                        </SectionBlock>
                    </div>

                    {/* Distribuição por Senioridade */}
                    <div data-onboarding-id="analytics-seniority">
                        <SectionBlock title="Distribuição por Senioridade" icon="signal_cellular_alt" iconColor="text-amber-400">
                            <div className="space-y-3">
                                <DistributionBar label="Estágio" value={generalStats.levelCounts.ESTAGIO} total={generalStats.totalJobs} colorClass="text-primary" bgClass="bg-primary" />
                                <DistributionBar label="Júnior" value={generalStats.levelCounts.JUNIOR} total={generalStats.totalJobs} colorClass="text-blue-400" bgClass="bg-blue-400" />
                                <DistributionBar label="Pleno" value={generalStats.levelCounts.PLENO} total={generalStats.totalJobs} colorClass="text-amber-400" bgClass="bg-amber-400" />
                                <DistributionBar label="Sênior" value={generalStats.levelCounts.SENIOR} total={generalStats.totalJobs} colorClass="text-purple-400" bgClass="bg-purple-400" />
                                <DistributionBar label="Outro" value={generalStats.levelCounts.OUTRO} total={generalStats.totalJobs} colorClass="text-slate-400" bgClass="bg-slate-400" />
                            </div>
                        </SectionBlock>
                    </div>

                </div>
            </main>
        </div>
    );
}
