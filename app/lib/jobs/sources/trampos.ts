import { JobSource } from '@prisma/client';

import type { RawSourceJob } from '../types';
import { fetchAndExtractJobDescription } from '../sourceDescription';

type TramposCard = {
    id: string;
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

function parseTramposCards(html: string): TramposCard[] {
    const cards: TramposCard[] = [];
    const seen = new Set<string>();
    const locationPattern = /(Home office|[\p{L}\s]+-\s?[A-Z]{2}(?:\s*\(Híbrido\))?)/iu;

    const regex = /<a[^>]+href="https:\/\/www\.trampos\.co\/oportunidades\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
        const id = match[1];

        if (seen.has(id)) {
            continue;
        }
        seen.add(id);

        const content = decodeEntities(stripTags(match[2]));
        if (!content || content.length < 8) {
            continue;
        }

        const parts = content.split(/\s{2,}|\s+-\s+/).map((item) => item.trim()).filter(Boolean);
        const title = parts[0] || content;
        const companyName = content.includes('CONFIDENCIAL')
            ? 'Confidencial'
            : parts[1] || 'Empresa não informada';

        const locationMatch = locationPattern.exec(content);
        const location = locationMatch?.[1]?.trim() || null;
        const level = normalizeLevel(content);
        const stack = extractStack(content);

        if (!isTechJob(`${title} ${companyName} ${content}`)) {
            continue;
        }

        cards.push({
            id,
            title,
            companyName,
            location,
            level,
            stack,
        });
    }

    return cards;
}

export async function fetchFromTrampos(limit = 80): Promise<RawSourceJob[]> {
    try {
        const response = await fetch('https://www.trampos.co/oportunidades', {
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
        const cards = parseTramposCards(html);

        const selectedCards = cards.slice(0, limit);

        const jobs = await Promise.all(selectedCards.map(async (job) => {
            const sourceUrl = `https://www.trampos.co/oportunidades/${job.id}`;
            const description = await fetchAndExtractJobDescription(sourceUrl);

            return {
                title: job.title,
                companyName: job.companyName,
                level: job.level,
                stack: job.stack,
                description: description || null,
                location: job.location,
                sourceUrl,
                source: JobSource.OTHER,
                externalId: `trampos-${job.id}`,
            } as RawSourceJob;
        }));

        return jobs;
    } catch {
        return [];
    }
}