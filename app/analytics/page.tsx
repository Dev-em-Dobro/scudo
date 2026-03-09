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
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-24 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bgClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-sm font-bold ${colorClass} w-8 text-right shrink-0`}>{value}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 w-9 shrink-0">{pct}%</span>
        </div>
    );
}

export default async function AnalyticsPage() {
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
    const hasSkills = knownSet.size > 0;

    // Apenas vagas com stack definido são avaliáveis — stack vazio não tem requisitos conhecidos
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
    const highFitJobs = fitScores.filter((value) => value >= 70).length;
    const mediumFitJobs = fitScores.filter((value) => value >= 50 && value < 70).length;
    const lowFitJobs = fitScores.filter((value) => value < 50).length;
    const evaluableCount = evaluableJobs.length;

    const workModelCounts = { Remoto: 0, Híbrido: 0, Presencial: 0 };
    const levelCounts = { ESTAGIO: 0, JUNIOR: 0, PLENO: 0, SENIOR: 0, OUTRO: 0 };

    for (const job of jobs) {
        const workModel = detectWorkModel(job.location, job.isRemote);
        workModelCounts[workModel] += 1;
        levelCounts[job.level] += 1;
    }

    let avgFitColor = 'text-red-400';
    if (avgFit >= 70) {
        avgFitColor = 'text-primary';
    } else if (avgFit >= 50) {
        avgFitColor = 'text-amber-400';
    }

    let avgFitIconBg = 'bg-red-500/10';
    if (avgFit >= 70) {
        avgFitIconBg = 'bg-primary/10';
    } else if (avgFit >= 50) {
        avgFitIconBg = 'bg-amber-500/10';
    }

    const statCards = [
        {
            key: 'total',
            title: 'Vagas Analisadas',
            value: String(jobs.length),
            description: 'Total de vagas no Job Board.',
            icon: 'work',
            iconColor: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
        },
        {
            key: 'fit',
            title: 'Fit Médio',
            value: hasSkills ? `${avgFit}%` : '—',
            description: hasSkills ? `Compat. média em ${evaluableCount} vagas com stack definido.` : 'Adicione skills ao perfil.',
            icon: 'target',
            iconColor: hasSkills ? avgFitColor : 'text-slate-400',
            iconBg: hasSkills ? avgFitIconBg : 'bg-slate-500/10',
        },
        {
            key: 'high',
            title: 'Alta Compat.',
            value: hasSkills ? String(highFitJobs) : '—',
            description: hasSkills ? 'Vagas com stack definido e fit ≥ 70%.' : 'Adicione skills ao perfil.',
            icon: 'verified',
            iconColor: hasSkills ? 'text-primary' : 'text-slate-400',
            iconBg: hasSkills ? 'bg-primary/10' : 'bg-slate-500/10',
        },
        {
            key: 'low',
            title: 'Baixa Compat.',
            value: hasSkills ? String(lowFitJobs) : '—',
            description: hasSkills ? 'Vagas com stack definido e fit abaixo de 50%.' : 'Adicione skills ao perfil.',
            icon: 'trending_down',
            iconColor: hasSkills ? 'text-red-400' : 'text-slate-400',
            iconBg: hasSkills ? 'bg-red-500/10' : 'bg-slate-500/10',
        },
    ];

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Seus Números" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">

                    {/* Stat cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{card.title}</p>
                                    <p className="text-2xl font-bold text-white mt-0.5">{card.value}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Distribuição por Fit e Modelo de Trabalho */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SectionBlock title="Distribuição por Fit" icon="donut_large" iconColor="text-primary">
                            {hasSkills ? (
                                <div className="space-y-3">
                                    <DistributionBar
                                        label="Alta (≥70%)"
                                        value={highFitJobs}
                                        total={evaluableCount}
                                        colorClass="text-primary"
                                        bgClass="bg-primary"
                                    />
                                    <DistributionBar
                                        label="Média (50–69%)"
                                        value={mediumFitJobs}
                                        total={evaluableCount}
                                        colorClass="text-amber-400"
                                        bgClass="bg-amber-400"
                                    />
                                    <DistributionBar
                                        label="Baixa (<50%)"
                                        value={lowFitJobs}
                                        total={evaluableCount}
                                        colorClass="text-red-400"
                                        bgClass="bg-red-400"
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Faça upload do seu currículo ou adicione suas skills no perfil para ver a distribuição de compatibilidade.
                                </p>
                            )}
                        </SectionBlock>

                        <SectionBlock title="Modelo de Trabalho" icon="location_on" iconColor="text-blue-400">
                            <div className="space-y-3">
                                <DistributionBar
                                    label="Remoto"
                                    value={workModelCounts.Remoto}
                                    total={jobs.length}
                                    colorClass="text-primary"
                                    bgClass="bg-primary"
                                />
                                <DistributionBar
                                    label="Híbrido"
                                    value={workModelCounts.Híbrido}
                                    total={jobs.length}
                                    colorClass="text-blue-400"
                                    bgClass="bg-blue-400"
                                />
                                <DistributionBar
                                    label="Presencial"
                                    value={workModelCounts.Presencial}
                                    total={jobs.length}
                                    colorClass="text-slate-400"
                                    bgClass="bg-slate-400"
                                />
                            </div>
                        </SectionBlock>
                    </div>

                    {/* Distribuição por Senioridade */}
                    <SectionBlock title="Distribuição por Senioridade" icon="signal_cellular_alt" iconColor="text-amber-400">
                        <div className="space-y-3">
                            <DistributionBar label="Estágio" value={levelCounts.ESTAGIO} total={jobs.length} colorClass="text-primary" bgClass="bg-primary" />
                            <DistributionBar label="Júnior" value={levelCounts.JUNIOR} total={jobs.length} colorClass="text-blue-400" bgClass="bg-blue-400" />
                            <DistributionBar label="Pleno" value={levelCounts.PLENO} total={jobs.length} colorClass="text-amber-400" bgClass="bg-amber-400" />
                            <DistributionBar label="Sênior" value={levelCounts.SENIOR} total={jobs.length} colorClass="text-purple-400" bgClass="bg-purple-400" />
                            <DistributionBar label="Outro" value={levelCounts.OUTRO} total={jobs.length} colorClass="text-slate-400" bgClass="bg-slate-400" />
                        </div>
                    </SectionBlock>

                </div>
            </main>
        </div>
    );
}
