import { JobSource } from '@prisma/client';

import type { RawSourceJob } from '../types';
import { inferStackFromText } from '../normalizers';
import { enrichStackWithAi } from '../stackAi';
import { extractSkillsSectionFromText } from '../extractSkillsSection';
import { extractRelevantDescriptionFromHtml } from '../sourceDescription';

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
    'ia', 'ai', 'inteligência artificial', 'inteligencia artificial',
    'automação', 'automacao', 'automation', 'n8n', 'make', 'make.com', 'low-code', 'nocode', 'no-code',
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
    return inferStackFromText(text);
}

type DetailData = { stack: string[]; description: string };

async function fetchDetail(slug: string): Promise<DetailData> {
    try {
        const response = await fetch(`https://programathor.com.br${slug}`, {
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'User-Agent': 'Scudo/1.0 (+job-aggregator)',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return { stack: [], description: '' };
        }

        const html = await response.text();
        const deterministicText = extractRelevantDescriptionFromHtml(html, 8000);
        const prioritizedText = extractSkillsSectionFromText(deterministicText);
        const deterministicStack = extractStack(prioritizedText);

        const stack = deterministicStack.length >= 3
            ? deterministicStack
            : await enrichStackWithAi({
                title: slug.replace('/jobs/', '').replaceAll('-', ' '),
                description: prioritizedText.slice(0, 8000),
                baseStack: deterministicStack,
            });

        return { stack, description: deterministicText.slice(0, 8000) };
    } catch {
        return { stack: [], description: '' };
    }
}

export async function fetchProgramathorDetailStackByUrl(sourceUrl: string): Promise<string[]> {
    try {
        const parsed = new URL(sourceUrl);
        const slug = `${parsed.pathname}`;
        if (!slug.startsWith('/jobs/')) {
            return [];
        }
        const { stack } = await fetchDetail(slug);
        return stack;
    } catch {
        return [];
    }
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

        const baseCards = cards.slice(0, limit);
        const enrichedCards = await Promise.all(baseCards.map(async (job) => {
            const { stack: detailStack, description } = await fetchDetail(job.slug);
            return {
                ...job,
                stack: [...new Set([...job.stack, ...detailStack])],
                description,
            };
        }));

        return enrichedCards.map((job) => ({
            title: job.title,
            companyName: job.companyName,
            level: job.level,
            stack: job.stack,
            description: job.description,
            location: job.location,
            sourceUrl: `https://programathor.com.br${job.slug}`,
            source: JobSource.OTHER,
            externalId: `programathor-${job.slug.split('/').pop()}`,
        }));
    } catch {
        return [];
    }
}