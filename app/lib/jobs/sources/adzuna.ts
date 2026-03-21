import { JobSource } from '@prisma/client';

import type { RawSourceJob } from '../types';

type AdzunaJob = {
    id?: string | number;
    title?: string;
    description?: string;
    redirect_url?: string;
    created?: string;
    location?: {
        display_name?: string;
    };
    company?: {
        display_name?: string;
    };
    category?: {
        label?: string;
    };
};

type AdzunaSearchResponse = {
    results?: AdzunaJob[];
};

const TECH_KEYWORDS = [
    'desenvolvedor', 'developer', 'engenheiro de software', 'software engineer', 'programador',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full stack', 'full-stack',
    'react', 'next', 'node', 'express', 'nestjs',
    'javascript', 'typescript', 'python',
    'java', 'kotlin', 'spring',
    '.net', 'dotnet', 'asp.net', 'c#',
    'php', 'laravel', 'ruby', 'rails', 'go', 'golang', 'rust',
    'django', 'flask',
    'qa', 'test', 'tester', 'devops', 'sre', 'cloud', 'data engineer',
    'software', 'it', 'tecnologia', 'technology',
];

const EXCLUDE_KEYWORDS = [
    'vendas', 'sales', 'marketing', 'comercial', 'rh', 'human resources',
    'financeiro', 'finance', 'jurídico', 'legal', 'administrativo', 'atendimento',
];

function isTechJob(text: string) {
    const value = text.toLowerCase();

    if (EXCLUDE_KEYWORDS.some((keyword) => value.includes(keyword))) {
        return false;
    }

    return TECH_KEYWORDS.some((keyword) => value.includes(keyword));
}

function extractStack(text: string): string[] {
    const source = text.toLowerCase();
    const stack: string[] = [];

    const languages = [
        'javascript', 'typescript', 'python',
        'java', 'kotlin', 'c#', 'php', 'ruby', 'go', 'rust',
    ];
    const frameworks = [
        'react', 'next', 'node', 'express', 'nestjs',
        'spring', 'django', 'flask', 'laravel', 'rails',
        '.net', 'dotnet', 'asp.net',
    ];

    languages.forEach((lang) => {
        if (source.includes(lang)) {
            stack.push(lang);
        }
    });

    frameworks.forEach((item) => {
        if (source.includes(item)) {
            stack.push(item);
        }
    });

    if (source.includes('frontend') || source.includes('front-end')) {
        stack.push('frontend');
    }
    if (source.includes('backend') || source.includes('back-end')) {
        stack.push('backend');
    }
    if (source.includes('fullstack') || source.includes('full stack') || source.includes('full-stack')) {
        stack.push('fullstack');
    }

    return [...new Set(stack)];
}

function normalizeLevel(text: string): string | null {
    const value = text.toLowerCase();

    if (value.includes('estágio') || value.includes('estagi') || value.includes('intern')) {
        return 'Estágio';
    }
    if (value.includes('júnior') || value.includes('junior') || value.includes('jr')) {
        return 'Júnior';
    }
    if (value.includes('pleno') || value.includes('mid')) {
        return 'Pleno';
    }
    if (value.includes('sênior') || value.includes('senior') || value.includes('sr')) {
        return 'Sênior';
    }

    return null;
}

export async function fetchFromAdzuna(limit = 120): Promise<RawSourceJob[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    const country = process.env.ADZUNA_COUNTRY ?? 'br';
    const where = process.env.ADZUNA_WHERE;
    const what = process.env.ADZUNA_WHAT ?? 'software developer';
    const whatExclude = process.env.ADZUNA_WHAT_EXCLUDE;

    if (!appId || !appKey) {
        return [];
    }

    const resultsPerPage = 50;
    const pages = Math.max(1, Math.ceil(limit / resultsPerPage));
    const allJobs: AdzunaJob[] = [];

    try {
        for (let page = 1; page <= pages; page += 1) {
            const params = new URLSearchParams({
                app_id: appId,
                app_key: appKey,
                results_per_page: String(resultsPerPage),
                what,
                'content-type': 'application/json',
            });

            if (where) {
                params.set('where', where);
            }

            if (whatExclude) {
                params.set('what_exclude', whatExclude);
            }

            const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Scudo/1.0 (+job-aggregator)',
                },
                signal: AbortSignal.timeout(20000),
            });

            if (!response.ok) {
                continue;
            }

            const payload = (await response.json()) as AdzunaSearchResponse;
            allJobs.push(...(payload.results ?? []));
        }

        const normalized = allJobs
            .filter((job) => Boolean(job.title && job.redirect_url))
            .filter((job) => {
                const searchableText = `${job.title ?? ''} ${job.category?.label ?? ''} ${job.description ?? ''}`;
                return isTechJob(searchableText);
            })
            .slice(0, limit)
            .map((job) => {
                const searchableText = `${job.title ?? ''} ${job.category?.label ?? ''} ${job.description ?? ''}`;
                return {
                    title: job.title ?? 'Vaga sem título',
                    companyName: job.company?.display_name ?? 'Empresa não informada',
                    level: normalizeLevel(searchableText),
                    stack: extractStack(searchableText),
                    location: job.location?.display_name ?? null,
                    publishedAt: job.created ?? null,
                    sourceUrl: job.redirect_url ?? '',
                    source: JobSource.OTHER,
                    externalId: job.id ? `adzuna-${job.id}` : null,
                } as RawSourceJob;
            })
            .filter((job) => Boolean(job.sourceUrl));

        return normalized;
    } catch {
        return [];
    }
}
