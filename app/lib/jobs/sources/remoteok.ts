import { JobSource } from '@prisma/client';

import type { RawSourceJob } from '../types';
import { normalizeDescriptionText } from '../sourceDescription';

type RemoteOkJob = {
    id?: number;
    position?: string;
    company?: string;
    url?: string;
    tags?: string[];
    description?: string;
    date?: string;
    location?: string;
};

const TECH_KEYWORDS = [
    'javascript', 'typescript', 'python',
    'react', 'next', 'node', 'express', 'nestjs',
    'developer', 'software engineer', 'programmer',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full-stack', 'full stack',
    'web', 'devops', 'sre', 'platform engineer',
    'qa', 'test', 'tester',
    'api', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'microservices', 'database',
];

const NON_TARGET_STACK_KEYWORDS = [
    '.net', 'dotnet', 'asp.net', 'c#',
    'java', 'kotlin', 'spring',
    'php', 'laravel',
    'ruby', 'rails',
    'go', 'golang',
    'rust', 'c++', 'swift',
    'delphi',
];

const EXCLUDE_KEYWORDS = [
    'sales', 'marketing', 'human resources', 'finance', 'accounting', 'legal',
    'administrative', 'customer service', 'operations', 'logistics',
];

const SENIOR_KEYWORDS = [
    'senior', 'sr.', 'sr ', ' sr', 'sr)', '(sr',
    'tech lead', 'technical lead', 'lead developer', 'lead engineer', 'team lead',
    'engineering manager', 'head of', 'director', 'principal', 'staff engineer', 'architect',
    'coordinator',
];

function isTechJob(text: string): boolean {
    const value = text.toLowerCase();

    if (EXCLUDE_KEYWORDS.some((keyword) => value.includes(keyword))) {
        return false;
    }

    if (NON_TARGET_STACK_KEYWORDS.some((keyword) => value.includes(keyword))) {
        return false;
    }

    if (SENIOR_KEYWORDS.some((keyword) => value.includes(keyword))) {
        return false;
    }

    return TECH_KEYWORDS.some((keyword) => value.includes(keyword));
}

function extractStack(text: string, tags: string[] = []) {
    const source = `${text} ${tags.join(' ')}`.toLowerCase();
    const stack: string[] = [];

    const languages = ['javascript', 'typescript', 'python'];
    const frameworks = ['react', 'next', 'node', 'express', 'nestjs'];

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

export async function fetchFromRemoteOk(limit = 120): Promise<RawSourceJob[]> {
    try {
        const response = await fetch('https://remoteok.com/api', {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Scudo/1.0',
            },
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            return [];
        }

        const payload = (await response.json()) as Array<RemoteOkJob | Record<string, unknown>>;

        const jobs = payload
            .filter((item): item is RemoteOkJob => 'position' in item)
            .filter((job) => job.position && job.company && job.url)
            .filter((job) => isTechJob(`${job.position ?? ''} ${(job.tags ?? []).join(' ')}`))
            .slice(0, limit)
            .map((job) => ({
                title: job.position ?? '',
                companyName: job.company ?? 'Empresa não informada',
                level: null,
                stack: extractStack(job.position ?? '', job.tags ?? []),
                description: job.description ? normalizeDescriptionText(job.description) : null,
                location: job.location ?? 'Remoto',
                publishedAt: job.date ?? null,
                sourceUrl: job.url ?? '',
                source: JobSource.OTHER,
                externalId: job.id ? `remoteok-${job.id}` : null,
            }))
            .filter((job) => Boolean(job.sourceUrl));

        return jobs;
    } catch {
        return [];
    }
}
