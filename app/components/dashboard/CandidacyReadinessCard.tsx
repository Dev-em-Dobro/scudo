'use client';

import { useAuth } from '@/app/providers/AuthProvider';
import type { JobListItem } from '@/app/lib/jobs/types';

interface CandidacyReadinessCardProps {
    readonly jobs: JobListItem[];
}

type JobFit = {
    readonly id: string;
    readonly title: string;
    readonly fitPercentage: number;
    readonly missingSkills: string[];
};

export default function CandidacyReadinessCard({ jobs }: Readonly<CandidacyReadinessCardProps>) {
    const { user } = useAuth();
    const normalize = (value: string) => value.toLowerCase().trim();
    const normalizedKnownTech = new Set(user.knownTechnologies.map(normalize));
    const hasSkills = normalizedKnownTech.size > 0;

    // Apenas vagas com stack definido são avaliáveis — stack vazio não tem requisitos conhecidos
    const evaluableJobs = jobs.filter((job) => job.stack.length > 0);

    const jobFitAnalysis: JobFit[] = hasSkills
        ? evaluableJobs.map((job) => {
            const requiredSkills = [...new Set(job.stack.map(normalize))];
            const matchedSkills = requiredSkills.filter((skill) => normalizedKnownTech.has(skill));
            const fitPercentage = Math.round((matchedSkills.length / requiredSkills.length) * 100);

            return {
                id: job.id,
                title: job.title,
                fitPercentage,
                missingSkills: requiredSkills.filter((skill) => !normalizedKnownTech.has(skill)),
            };
        })
        : [];

    const compatibleJobs = jobFitAnalysis.filter((job) => job.fitPercentage >= 50);
    const insufficientJobs = jobFitAnalysis.filter((job) => job.fitPercentage < 50);

    const missingSkillFrequency = new Map<string, number>();
    for (const job of insufficientJobs) {
        for (const skill of job.missingSkills) {
            missingSkillFrequency.set(skill, (missingSkillFrequency.get(skill) ?? 0) + 1);
        }
    }

    const prioritizedMissingSkills = [...missingSkillFrequency.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6)
        .map(([skill]) => skill);

    let statusText = 'Aguardando vagas disponíveis para cálculo de aptidão';

    if (hasSkills && evaluableJobs.length > 0 && insufficientJobs.length === 0) {
        statusText = 'Apto para candidatura nas vagas avaliadas';
    } else if (hasSkills && evaluableJobs.length > 0) {
        statusText = `Você está apto para ${compatibleJobs.length} de ${evaluableJobs.length} vagas avaliadas`;
    }

    const showGapRecommendation = hasSkills && insufficientJobs.length > 0;

    const avgFit = hasSkills && jobFitAnalysis.length > 0
        ? Math.round(jobFitAnalysis.reduce((sum, job) => sum + job.fitPercentage, 0) / jobFitAnalysis.length)
        : 0;

    return (
        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-colors">
            <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <span
                        className="material-symbols-outlined text-amber-400"
                        style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
                    >
                        track_changes
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-white">Status de Aptidão</h2>
                        {hasSkills && jobs.length > 0 && (
                            <span className="text-sm font-bold text-amber-400">{avgFit}% médio</span>
                        )}
                    </div>

                    {hasSkills ? (
                        <>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{statusText}</p>

                            {showGapRecommendation && (
                                <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                                    <p className="text-xs font-bold text-amber-400 uppercase mb-1.5 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}>warning</span>
                                        {" "}Skills prioritárias
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Priorize as skills abaixo para aumentar sua compatibilidade com as vagas atuais.
                                    </p>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {prioritizedMissingSkills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Adicione suas skills ao perfil para ver sua aptidão nas vagas.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
