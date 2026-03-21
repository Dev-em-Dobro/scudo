import { JobSource } from '@prisma/client';

import type { RawSourceJob } from '../types';

type ProgramathorJobCard = {
    slug: string;
    title: string;
    companyName: string;
    location: string | null;
    level: string | null;
    stack: string[];
};

const EXCLUDE_KEYWORDS = [
    'vendas', 'sales', 'marketing', 'comercial', 'rh', 'human resources',
    'financeiro', 'finance', 'jurídico', 'legal', 'administrativo', 'atendimento',
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

const TECH_KEYWORDS = [
    'desenvolvedor', 'developer', 'engenheiro de software', 'software engineer', 'programador',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full stack', 'full-stack',
    'react', 'next', 'node', 'express', 'nestjs',
    'javascript', 'typescript', 'python',
    'qa', 'test', 'tester', 'devops', 'sre',
];

function stripTags(value: string) {
    return value
        .replaceAll(/<[^>]*>/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();
}

function decodeEntities(value: string) {
    return value
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
}

function isTechJob(text: string) {
    const value = text.toLowerCase();

    if (EXCLUDE_KEYWORDS.some((keyword) => value.includes(keyword))) {
        return false;
    }

    if (NON_TARGET_STACK_KEYWORDS.some((keyword) => value.includes(keyword))) {
        return false;
    }

    return TECH_KEYWORDS.some((keyword) => value.includes(keyword));
}

function normalizeLevel(text: string): string | null {
    const value = text.toLowerCase();

    if (value.includes('estágio') || value.includes('estagi')) {
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

function extractStack(text: string): string[] {
    const source = text.toLowerCase();
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

function parseJobCards(html: string): ProgramathorJobCard[] {
    const cards: ProgramathorJobCard[] = [];
    const seen = new Set<string>();
    const titleCompanyPattern = /^(.*?)\s+\uF0B1?\s*(.*?)\s+\uF3C5/;
    const locationPattern = /\uF3C5\s*([^\uF186\uF080\uF15C\uF072]+)/;
    const levelPattern = /\uF080\s*([^\uF15C\uF072]+)/;

    const regex = /<a[^>]+href="(\/jobs\/(\d+)-[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
        const slug = match[1];

        if (seen.has(slug)) {
            continue;
        }
        seen.add(slug);

        const block = decodeEntities(stripTags(match[3]));
        if (!block || block.length < 8) {
            continue;
        }

        const titleCompanyMatch = titleCompanyPattern.exec(block);
        const title = titleCompanyMatch?.[1]?.trim() || block.split('  ')[0]?.trim() || block;
        const companyName = titleCompanyMatch?.[2]?.trim() || 'Empresa não informada';

        const locationMatch = locationPattern.exec(block);
        const levelMatch = levelPattern.exec(block);

        const location = locationMatch?.[1]?.trim() || null;
        const level = levelMatch?.[1]?.trim() || null;

        const searchableText = `${title} ${companyName} ${block}`;
        if (!isTechJob(searchableText)) {
            continue;
        }

        cards.push({
            slug,
            title,
            companyName,
            location,
            level: normalizeLevel(level ?? block),
            stack: extractStack(searchableText),
        });
    }

    return cards;
}

export async function fetchFromProgramathor(limit = 80): Promise<RawSourceJob[]> {
    try {
        const response = await fetch('https://programathor.com.br/jobs', {
            headers: {
                'Accept': 'text/html,application/xhtml+xml',
                'User-Agent': 'Scudo/1.0 (+job-aggregator)',
            },
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            return [];
        }

        const html = await response.text();
        const cards = parseJobCards(html);

        return cards.slice(0, limit).map((job) => ({
            title: job.title,
            companyName: job.companyName,
            level: job.level,
            stack: job.stack,
            location: job.location,
            sourceUrl: `https://programathor.com.br${job.slug}`,
            source: JobSource.OTHER,
            externalId: `programathor-${job.slug.split('/').pop()}`,
        }));
    } catch {
        return [];
    }
}