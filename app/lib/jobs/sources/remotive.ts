import { JobSource } from '@prisma/client';

import type { RawSourceJob } from '../types';
import { normalizeDescriptionText } from '../sourceDescription';

interface RemotiveJob {
    id: number;
    url: string;
    title: string;
    company_name: string;
    category?: string;
    tags?: string[];
    description?: string;
    job_type?: string;
    publication_date?: string;
    candidate_required_location?: string;
}

interface RemotiveApiResponse {
    jobs: RemotiveJob[];
}

const TECH_KEYWORDS = [
    'javascript', 'typescript', 'python',
    'react', 'next', 'node', 'express', 'nestjs',
    'desenvolvedor', 'developer', 'engenheiro de software', 'software engineer', 'programador',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full-stack', 'full stack',
    'mobile', 'ios', 'android', 'web', 'devops', 'sre', 'platform engineer',
    'qa', 'quality assurance', 'test', 'tester',
    'api', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'microservices', 'database',
];

const NON_TARGET_STACK_KEYWORDS = [
    '.net', 'dotnet', 'asp.net', 'c#',
    'java', 'kotlin', 'spring',
    'php', 'laravel',
    'ruby', 'rails',
    'go', 'golang',
    'rust', 'c++', 'swift',
    'android', 'ios',
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

export async function fetchFromRemotive(limit = 150): Promise<RawSourceJob[]> {
    try {
        const response = await fetch('https://remotive.com/api/remote-jobs', {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Scudo/1.0',
            },
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            return [];
        }

        const payload = (await response.json()) as RemotiveApiResponse;
        const jobs = payload.jobs ?? [];

        return jobs
            .filter((job) => isTechJob(`${job.title} ${job.category ?? ''} ${(job.tags ?? []).join(' ')}`))
            .slice(0, limit)
            .map((job) => ({
                title: job.title,
                companyName: job.company_name,
                level: job.job_type ?? null,
                stack: extractStack(job.title, job.tags),
                description: job.description ? normalizeDescriptionText(job.description) : null,
                location: job.candidate_required_location ?? 'Remoto',
                publishedAt: job.publication_date ?? null,
                sourceUrl: job.url,
                source: JobSource.OTHER,
                externalId: `remotive-${job.id}`,
            }));
    } catch {
        return [];
    }
}
