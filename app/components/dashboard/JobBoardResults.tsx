'use client';

import { useCallback, useMemo, useState } from 'react';

import type { JobListItem } from '@/app/lib/jobs/types';
import { inferStackFromTitle } from '@/app/lib/jobs/normalizers';
import { useAuth } from '@/app/providers/AuthProvider';
import CuratedJobCard from '@/app/components/dashboard/CuratedJobCard';
import SearchFilterBar from '@/app/components/dashboard/SearchFilterBar';

interface JobBoardResultsProps {
    readonly jobs: JobListItem[];
}

type SortMode = 'relevant' | 'newest' | 'salary';
type LevelFilter = 'all' | JobListItem['level'];
type WorkModelFilter = 'all' | 'remote' | 'hybrid' | 'onsite';

const ITEMS_PER_PAGE = 10;

const levelPriority: Record<JobListItem['level'], number> = {
    ESTAGIO: 0,
    JUNIOR: 1,
    PLENO: 2,
    SENIOR: 3,
    OUTRO: 4,
};

const levelLabel: Record<JobListItem['level'], string> = {
    ESTAGIO: 'estágio',
    JUNIOR: 'júnior',
    PLENO: 'pleno',
    SENIOR: 'sênior',
    OUTRO: 'outro',
};

function normalize(value: string) {
    return value.toLowerCase().trim();
}

function detectWorkModel(job: JobListItem): Exclude<WorkModelFilter, 'all'> {
    const location = normalize(job.location ?? '');

    if (job.isRemote || /remoto|remote|home\s?office/.test(location)) {
        return 'remote';
    }

    if (/h[ií]brido|hybrid/.test(location)) {
        return 'hybrid';
    }

    return 'onsite';
}

function calculateJobFit(job: JobListItem, knownTechnologies: string[]) {
    const stackSkills = job.stack.map(normalize).filter(Boolean);

    // Se stack está vazio, tenta inferir skills do título
    const requiredSkills = stackSkills.length > 0
        ? stackSkills
        : inferStackFromTitle(job.title);

    // Sem nenhuma informação de requisitos — fica no fim do ranking
    if (requiredSkills.length === 0) {
        return -1;
    }

    const known = new Set(knownTechnologies.map(normalize));
    const matched = requiredSkills.filter((skill) => known.has(skill));

    return Math.round((matched.length / requiredSkills.length) * 100);
}

export default function JobBoardResults({ jobs }: Readonly<JobBoardResultsProps>) {
    const { user } = useAuth();
    const [searchValue, setSearchValue] = useState('');
    const [sortMode, setSortMode] = useState<SortMode>('relevant');
    const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
    const [workModelFilter, setWorkModelFilter] = useState<WorkModelFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);

    const resetPage = useCallback(() => {
        setCurrentPage(1);
    }, []);

    const filteredAndSortedJobs = useMemo(() => {
        const query = normalize(searchValue);

        const filtered = jobs.filter((job) => {
            const searchableFields = [
                normalize(job.title),
                normalize(job.companyName),
                normalize(job.location ?? ''),
                normalize(levelLabel[job.level]),
                normalize(job.isRemote ? 'remoto remote' : ''),
                ...job.stack.map(normalize),
            ];

            const matchesSearch = !query || searchableFields.some((field) => field.includes(query));
            const matchesLevel = levelFilter === 'all' || job.level === levelFilter;
            const workModel = detectWorkModel(job);
            const matchesWorkModel = workModelFilter === 'all' || workModel === workModelFilter;

            return matchesSearch && matchesLevel && matchesWorkModel;
        });

        const sorted = [...filtered].sort((left, right) => {
            if (sortMode === 'newest') {
                const createdDiff = right.createdAt.getTime() - left.createdAt.getTime();
                if (createdDiff !== 0) {
                    return createdDiff;
                }

                const publishedDiff = (right.publishedAt ?? right.createdAt).getTime()
                    - (left.publishedAt ?? left.createdAt).getTime();
                if (publishedDiff !== 0) {
                    return publishedDiff;
                }

                return right.title.localeCompare(left.title);
            }

            const levelDiff = levelPriority[left.level] - levelPriority[right.level];
            if (levelDiff !== 0) {
                return levelDiff;
            }

            if (sortMode === 'salary') {
                return left.companyName.localeCompare(right.companyName);
            }

            const fitLeft = calculateJobFit(left, user.knownTechnologies);
            const fitRight = calculateJobFit(right, user.knownTechnologies);
            if (fitLeft !== fitRight) {
                return fitRight - fitLeft;
            }

            const leftDate = left.publishedAt ?? left.createdAt;
            const rightDate = right.publishedAt ?? right.createdAt;
            return rightDate.getTime() - leftDate.getTime();
        });

        return sorted;
    }, [jobs, levelFilter, searchValue, sortMode, user.knownTechnologies, workModelFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredAndSortedJobs.length / ITEMS_PER_PAGE));
    const activePage = Math.min(currentPage, totalPages);

    const paginatedJobs = useMemo(() => {
        const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [activePage, filteredAndSortedJobs]);

    const startItem = filteredAndSortedJobs.length === 0 ? 0 : (activePage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(activePage * ITEMS_PER_PAGE, filteredAndSortedJobs.length);

    return (
        <div className="space-y-6">
            <SearchFilterBar
                onSearchChange={(value) => {
                    setSearchValue(value);
                    resetPage();
                }}
                onLevelChange={(value) => {
                    setLevelFilter((value as LevelFilter) || 'all');
                    resetPage();
                }}
                onWorkModelChange={(value) => {
                    setWorkModelFilter((value as WorkModelFilter) || 'all');
                    resetPage();
                }}
                onSortChange={(value) => {
                    setSortMode((value as SortMode) || 'relevant');
                    resetPage();
                }}
            />

            {filteredAndSortedJobs.length > 0 ? (
                <>
                    <div className="space-y-4">
                        {paginatedJobs.map((job) => <CuratedJobCard key={job.id} job={job} />)}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Mostrando <span className="font-semibold text-slate-900 dark:text-white">{startItem}–{endItem}</span> de <span className="font-semibold text-slate-900 dark:text-white">{filteredAndSortedJobs.length}</span> vagas
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-background-dark text-slate-700 dark:text-slate-200 hover:border-primary/60 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={activePage <= 1}
                            >
                                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "16px" }}>chevron_left</span>
                                {" "}Anterior
                            </button>

                            <span className="text-sm text-slate-600 dark:text-slate-300 px-2">
                                {activePage} / {totalPages}
                            </span>

                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-background-dark text-slate-700 dark:text-slate-200 hover:border-primary/60 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                disabled={activePage >= totalPages}
                            >
                                Próxima{" "}
                                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "16px" }}>chevron_right</span>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-10 flex flex-col items-center gap-3 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600" style={{ fontVariationSettings: "'FILL' 1" }}>search_off</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nenhuma vaga encontrada</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tente ajustar os filtros ou o termo de busca.</p>
                </div>
            )}
        </div>
    );
}
