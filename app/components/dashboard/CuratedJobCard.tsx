"use client";

import { useMemo, useState } from "react";
import type { JobListItem } from "@/app/lib/jobs/types";
import { inferStackFromTitle } from "@/app/lib/jobs/normalizers";
import { useAuth } from "@/app/providers/AuthProvider";

interface CuratedJobCardProps {
    readonly job: JobListItem;
}

const levelLabel: Record<JobListItem["level"], string> = {
    ESTAGIO: "Estágio",
    JUNIOR: "Júnior",
    PLENO: "Pleno",
    SENIOR: "Sênior",
    OUTRO: "Outro",
};

const levelColor: Record<JobListItem["level"], string> = {
    ESTAGIO: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    JUNIOR: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    PLENO: "bg-violet-950/60 text-violet-100 border-violet-700/60",
    SENIOR: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    OUTRO: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const sourceLabel: Record<JobListItem["source"], string> = {
    LINKEDIN: "LinkedIn",
    GUPY: "Gupy",
    COMPANY_SITE: "Site da empresa",
    OTHER: "Outra fonte",
};

function timeAgo(date: Date | null | undefined): string {
    if (!date) return "—";
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 24) return `Há ${hours} hora${hours === 1 ? "" : "s"}`;
    const days = Math.floor(diff / 86_400_000);
    if (days < 30) return `Há ${days} dia${days === 1 ? "" : "s"}`;
    const months = Math.floor(days / 30);
    return `Há ${months} ${months === 1 ? "mês" : "meses"}`;
}

function getFitBadgeClass(pct: number, isEstimated: boolean) {
    if (isEstimated) {
        return "bg-slate-800 dark:bg-slate-900 text-slate-400 border border-slate-500/40 border-dashed";
    }
    if (pct >= 80) return "bg-violet-950/60 text-violet-100 border border-violet-700/60";
    if (pct >= 50) return "bg-slate-800 dark:bg-slate-900 text-amber-400 border border-amber-500/40";
    return "bg-slate-800 dark:bg-slate-900 text-red-400 border border-red-500/40";
}

function getFitIconClass(pct: number, isEstimated: boolean) {
    if (isEstimated) return "text-slate-400";
    if (pct >= 80) return "text-violet-500";
    if (pct >= 50) return "text-amber-400";
    return "text-red-400";
}

function getFitIcon(pct: number, isEstimated: boolean) {
    if (isEstimated) return "help";
    if (pct >= 50) return "check_circle";
    return "cancel";
}

export default function CuratedJobCard({ job }: Readonly<CuratedJobCardProps>) {
    const { user } = useAuth();
    const [showSkillGapAlert, setShowSkillGapAlert] = useState(false);

    const fit = useMemo(() => {
        const normalize = (value: string) => value.toLowerCase().trim();
        const stackSkills = job.stack.map(normalize).filter(Boolean);

        // Se stack está vazio, tenta inferir do título
        const requiredSkills = stackSkills.length > 0
            ? stackSkills
            : inferStackFromTitle(job.title);
        const isEstimated = stackSkills.length === 0 && requiredSkills.length > 0;

        // Não há informação nem no stack nem no título
        if (requiredSkills.length === 0) {
            return { fitPercentage: null, isEstimated: false, missingSkills: [], isInsufficient: false };
        }

        const knownSkills = new Set(user.knownTechnologies.map(normalize));
        const matchedSkills = requiredSkills.filter((skill) => knownSkills.has(skill));
        const fitPercentage = Math.round((matchedSkills.length / requiredSkills.length) * 100);

        return {
            fitPercentage,
            isEstimated,
            missingSkills: requiredSkills.filter((skill) => !knownSkills.has(skill)),
            isInsufficient: fitPercentage < 50,
        };
    }, [job.stack, job.title, user.knownTechnologies]);

    function handleApplyClick() {
        if (fit.isInsufficient) {
            setShowSkillGapAlert(true);
            return;
        }
        window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
    }

    const publishedDate = job.publishedAt ?? job.createdAt;

    return (
        <article className="group bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-200">
            {/* Top row: title + fit badge */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors duration-150 line-clamp-2 min-w-0">
                            {job.title}
                        </h3>
                        <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${levelColor[job.level]}`}>
                            {levelLabel[job.level].toUpperCase()}
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-300 mt-1.5 flex items-center gap-1 flex-wrap">
                        <span className="material-symbols-outlined leading-none" style={{ fontSize: "15px" }}>business</span>
                        <span>{job.companyName}</span>
                        {job.location && (
                            <>
                                <span className="text-slate-300 dark:text-slate-500 mx-0.5">•</span>
                                <span className="material-symbols-outlined leading-none" style={{ fontSize: "15px" }}>location_on</span>
                                <span>{job.location}</span>
                            </>
                        )}
                        {job.isRemote && !job.location && (
                            <>
                                <span className="text-slate-300 dark:text-slate-500 mx-0.5">•</span>
                                <span>Remoto</span>
                            </>
                        )}
                    </p>
                </div>

                {/* Fit badge — dark pill */}
                {fit.fitPercentage === null ? (
                    <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 dark:bg-slate-900 text-slate-500 border border-slate-600/40 border-dashed">
                        <span className="material-symbols-outlined" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}>{"help"}</span>
                        {"? fit"}
                    </div>
                ) : (
                    <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getFitBadgeClass(fit.fitPercentage, fit.isEstimated)}`}>
                        <span
                            className={`material-symbols-outlined ${getFitIconClass(fit.fitPercentage, fit.isEstimated)}`}
                            style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}
                        >
                            {getFitIcon(fit.fitPercentage, fit.isEstimated)}
                        </span>
                        {`${fit.isEstimated ? '~' : ''}${fit.fitPercentage}% fit`}
                    </div>
                )}
            </div>

            {/* Meta row */}
            <div className="mt-3 flex items-center gap-5 text-xs font-medium tracking-wide">
                <span className="text-slate-400 dark:text-slate-300 uppercase">
                    Fonte:{" "}
                    <span className="text-slate-500 dark:text-slate-200 normal-case font-semibold tracking-normal">{sourceLabel[job.source]}</span>
                </span>
                <span className="text-slate-400 dark:text-slate-300 uppercase">
                    Publicada:{" "}
                    <span className="text-slate-500 dark:text-slate-200 normal-case font-semibold tracking-normal">{timeAgo(publishedDate)}</span>
                </span>
            </div>

            {/* Stack tags */}
            {job.stack.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                    {job.stack.map((tag) => (
                        <span
                            key={`${job.id}-${tag}`}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-mono font-medium text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-md"
                        >
                            {tag.toUpperCase()}
                        </span>
                    ))}
                </div>
            )}

            {/* Skill gap alert */}
            {showSkillGapAlert && fit.fitPercentage !== null && fit.isInsufficient && (
                <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <p className="text-xs font-bold text-amber-400 uppercase mb-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}>warning</span>
                        {" "}Skills insuficientes
                    </p>
                    <p className="text-xs text-slate-400">
                        O nível desta vaga é superior ao seu estágio atual. Priorize adquirir as skills abaixo antes de se candidatar.
                    </p>
                    {fit.missingSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {fit.missingSkills.map((skill) => (
                                <span
                                    key={`${job.id}-missing-${skill}`}
                                    className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Actions row */}
            <div className="mt-4 pt-3.5 border-t border-border-light dark:border-border-dark flex items-center justify-between gap-4">
                <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                    Ver vaga completa
                </a>
                <button
                    type="button"
                    onClick={handleApplyClick}
                    className="cursor-pointer px-5 py-2 bg-primary hover:bg-primary/90 active:scale-95 text-white text-xs font-bold rounded-lg uppercase tracking-wide transition-all duration-150 shadow-sm shadow-primary/20"
                >
                    Candidatar
                </button>
            </div>
        </article>
    );
}
