import { JobSource } from '@prisma/client';

import type { RawSourceJob } from '../types';
import { normalizeDescriptionText } from '../sourceDescription';

type LinkedInCard = {
    externalId: string;
    title: string;
    companyName: string;
    location: string | null;
    publishedAtLabel: string | null;
    sourceUrl: string;
};

type LinkedInFetchQuery = {
    keywords: string;
    experienceLevel: '1' | '2';
};

const SEARCH_ENDPOINT = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const JOB_POSTING_ENDPOINT = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';

const SEARCH_QUERIES: LinkedInFetchQuery[] = [
    { keywords: 'estagio desenvolvimento web', experienceLevel: '1' },
    { keywords: 'estagio frontend javascript', experienceLevel: '1' },
    { keywords: 'estagio backend node', experienceLevel: '1' },
    { keywords: 'desenvolvedor junior frontend', experienceLevel: '2' },
    { keywords: 'desenvolvedor junior backend', experienceLevel: '2' },
    { keywords: 'desenvolvedor web junior', experienceLevel: '2' },
];

const COURSE_LANGUAGE_KEYWORDS = ['javascript', 'typescript', 'python'];
const TARGET_AREA_KEYWORDS = [
    'desenvolvedor',
    'developer',
    'engenheiro de software',
    'software engineer',
    'programador',
    'frontend',
    'front-end',
    'backend',
    'back-end',
    'fullstack',
    'full stack',
    'full-stack',
    'web',
    'react',
    'next',
    'node',
    'express',
    'nestjs',
];

const SENIOR_BLOCK_KEYWORDS = [
    'sênior',
    'senior',
    'sénior',
    'pleno',
    'mid',
    'middle',
    'tech lead',
    'lead',
    'staff',
    'principal',
    'architect',
    'arquiteto',
    'arquiteta',
    'manager',
    'gerente',
    'coordenador',
    'coordenadora',
    'director',
    'diretor',
    'head of',
];

const URN_EXTERNAL_ID_REGEX = /urn:li:jobPosting:(\d+)/i;
const QUERY_EXTERNAL_ID_REGEX = /[?&]currentJobId=(\d+)/i;
const PATH_EXTERNAL_ID_REGEX = /-(\d+)(?:\?|\/|$)/i;
const HOURS_AGO_REGEX = /(\d+)\s*h/;
const DAYS_AGO_REGEX = /(\d+)\s*d/;
const WEEKS_AGO_REGEX = /(\d+)\s*w/;
const DETAIL_DESCRIPTION_REGEX = /class=["'][^"']*description[^"']*["'][^>]*>\s*<section[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>/i;

const PAGE_SIZE = 25;

function getLinkedInLookbackDays() {
    const parsed = Number(process.env.JOBS_LINKEDIN_LOOKBACK_DAYS ?? '15');

    if (Number.isNaN(parsed) || parsed <= 0) {
        return 15;
    }

    return Math.min(parsed, 30);
}

function isWithinLookbackWindow(publishedAtIso: string | null, lookbackDays: number) {
    if (!publishedAtIso) {
        return true;
    }

    const publishedAt = new Date(publishedAtIso);

    if (Number.isNaN(publishedAt.getTime())) {
        return true;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);

    return publishedAt >= cutoff;
}

function decodeHtmlEntities(value: string): string {
    return value
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
}

function stripTags(value: string): string {
    return decodeHtmlEntities(value)
        .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replaceAll(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replaceAll(/<[^>]*>/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();
}

function extractByClassText(fragment: string, classFragment: string): string {
    const regex = new RegExp(
        String.raw`<[^>]*class=["'][^"']*${classFragment}[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>`,
        'i',
    );

    const match = regex.exec(fragment);
    return match?.[1] ? stripTags(match[1]) : '';
}

function extractHrefByClass(fragment: string, classFragment: string): string {
    const regex = new RegExp(
        String.raw`<a[^>]*class=["'][^"']*${classFragment}[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>`,
        'i',
    );

    const match = regex.exec(fragment);
    return match?.[1]?.trim() ?? '';
}

function normalizeLinkedInJobUrl(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl, 'https://www.linkedin.com');
        parsed.search = '';
        parsed.hash = '';
        return parsed.toString();
    } catch {
        return rawUrl.trim();
    }
}

function extractExternalId(sourceUrl: string, fragment: string): string | null {
    const byUrn = URN_EXTERNAL_ID_REGEX.exec(fragment)?.[1];
    if (byUrn) {
        return byUrn;
    }

    const byQuery = QUERY_EXTERNAL_ID_REGEX.exec(sourceUrl)?.[1];
    if (byQuery) {
        return byQuery;
    }

    const byPath = PATH_EXTERNAL_ID_REGEX.exec(sourceUrl)?.[1];
    return byPath ?? null;
}

function parseCardsFromHtml(html: string): LinkedInCard[] {
    const listItemFragments = html.split(/<li\b/i);
    const cards: LinkedInCard[] = [];
    const seenExternalIds = new Set<string>();

    for (const itemFragment of listItemFragments) {
        if (!/base-card/i.test(itemFragment)) {
            continue;
        }

        const title = extractByClassText(itemFragment, '_title');
        const companyName = extractByClassText(itemFragment, '_subtitle');
        const location = extractByClassText(itemFragment, '_location') || null;
        const publishedAtLabel = extractByClassText(itemFragment, 'listdate') || null;
        const sourceUrlRaw = extractHrefByClass(itemFragment, '_full-link');

        if (!title || !sourceUrlRaw) {
            continue;
        }

        const sourceUrl = normalizeLinkedInJobUrl(sourceUrlRaw);
        const externalId = extractExternalId(sourceUrl, itemFragment);

        if (!externalId || seenExternalIds.has(externalId)) {
            continue;
        }

        seenExternalIds.add(externalId);

        cards.push({
            externalId,
            title,
            companyName: companyName || 'Empresa não informada',
            location,
            publishedAtLabel,
            sourceUrl,
        });
    }

    return cards;
}

function isTargetJob(text: string): boolean {
    const value = text.toLowerCase();

    const hasCourseLanguage = COURSE_LANGUAGE_KEYWORDS.some((keyword) => value.includes(keyword));
    const hasTargetArea = TARGET_AREA_KEYWORDS.some((keyword) => value.includes(keyword));

    if (!hasCourseLanguage || !hasTargetArea) {
        return false;
    }

    if (SENIOR_BLOCK_KEYWORDS.some((keyword) => value.includes(keyword))) {
        return false;
    }

    return true;
}

function inferLevelFromText(text: string): string {
    const value = text.toLowerCase();

    if (/est[aá]gio|intern|estagi[aá]rio/.test(value)) {
        return 'Estágio';
    }

    if (/j[uú]nior|junior|\bjr\b|entry[-\s]?level/.test(value)) {
        return 'Júnior';
    }

    return 'Júnior';
}

function parsePublishedAt(label: string | null): string | null {
    if (!label) {
        return null;
    }

    const value = label.toLowerCase();
    const now = new Date();

    const hoursMatch = HOURS_AGO_REGEX.exec(value);
    if (hoursMatch) {
        const hours = Number(hoursMatch[1]);
        if (!Number.isNaN(hours)) {
            now.setHours(now.getHours() - hours);
            return now.toISOString();
        }
    }

    const daysMatch = DAYS_AGO_REGEX.exec(value);
    if (daysMatch) {
        const days = Number(daysMatch[1]);
        if (!Number.isNaN(days)) {
            now.setDate(now.getDate() - days);
            return now.toISOString();
        }
    }

    const weeksMatch = WEEKS_AGO_REGEX.exec(value);
    if (weeksMatch) {
        const weeks = Number(weeksMatch[1]);
        if (!Number.isNaN(weeks)) {
            now.setDate(now.getDate() - (weeks * 7));
            return now.toISOString();
        }
    }

    return null;
}

async function fetchLinkedInSearchPage(query: LinkedInFetchQuery, start: number): Promise<string> {
    const params = new URLSearchParams({
        start: String(start),
        keywords: query.keywords,
        location: process.env.JOBS_LINKEDIN_LOCATION ?? 'Brazil',
        f_AL: 'true',
        f_E: query.experienceLevel,
        f_TPR: process.env.JOBS_LINKEDIN_TPR ?? 'r2592000',
    });

    const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
        headers: {
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'User-Agent': 'Scudo/1.0 (+job-aggregator)',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        return '';
    }

    return response.text();
}

async function fetchLinkedInDetailDescription(externalId: string): Promise<string> {
    try {
        const response = await fetch(`${JOB_POSTING_ENDPOINT}/${externalId}`, {
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'User-Agent': 'Scudo/1.0 (+job-aggregator)',
            },
            signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
            return '';
        }

        const html = await response.text();
        const descriptionMatch = DETAIL_DESCRIPTION_REGEX.exec(html);

        if (!descriptionMatch?.[1]) {
            return '';
        }

        return normalizeDescriptionText(stripTags(descriptionMatch[1]), 8000);
    } catch {
        return '';
    }
}

async function mapCardToRawJob(card: LinkedInCard): Promise<RawSourceJob | null> {
    const description = await fetchLinkedInDetailDescription(card.externalId);
    const searchableText = `${card.title} ${description}`;
    const publishedAt = parsePublishedAt(card.publishedAtLabel);
    const lookbackDays = getLinkedInLookbackDays();

    if (!isTargetJob(searchableText)) {
        return null;
    }

    if (!isWithinLookbackWindow(publishedAt, lookbackDays)) {
        return null;
    }

    return {
        title: card.title,
        companyName: card.companyName,
        level: inferLevelFromText(searchableText),
        stack: [],
        description: description || null,
        location: card.location,
        publishedAt,
        sourceUrl: card.sourceUrl,
        source: JobSource.LINKEDIN,
        externalId: card.externalId,
    };
}

async function mapCardsWithConcurrency(cards: LinkedInCard[], concurrency = 4): Promise<RawSourceJob[]> {
    const jobs: RawSourceJob[] = [];

    for (let index = 0; index < cards.length; index += concurrency) {
        const chunk = cards.slice(index, index + concurrency);
        const chunkJobs = await Promise.all(chunk.map((card) => mapCardToRawJob(card)));

        for (const job of chunkJobs) {
            if (job) {
                jobs.push(job);
            }
        }
    }

    return jobs;
}

function appendUniqueCards(params: {
    cards: LinkedInCard[];
    allCards: LinkedInCard[];
    seenExternalIds: Set<string>;
    limit: number;
}): boolean {
    const { cards, allCards, seenExternalIds, limit } = params;

    for (const card of cards) {
        if (seenExternalIds.has(card.externalId)) {
            continue;
        }

        seenExternalIds.add(card.externalId);
        allCards.push(card);

        if (allCards.length >= limit) {
            return true;
        }
    }

    return false;
}

async function collectCardsForQuery(params: {
    query: LinkedInFetchQuery;
    maxPages: number;
    allCards: LinkedInCard[];
    seenExternalIds: Set<string>;
    limit: number;
}): Promise<boolean> {
    const { query, maxPages, allCards, seenExternalIds, limit } = params;

    for (let page = 0; page < maxPages; page += 1) {
        const start = page * PAGE_SIZE;
        const html = await fetchLinkedInSearchPage(query, start);

        if (!html) {
            continue;
        }

        const cards = parseCardsFromHtml(html);
        const reachedLimit = appendUniqueCards({ cards, allCards, seenExternalIds, limit });

        if (reachedLimit) {
            return true;
        }

        if (cards.length === 0) {
            break;
        }
    }

    return false;
}

async function collectLinkedInCards(limit: number, maxPages: number): Promise<LinkedInCard[]> {
    const allCards: LinkedInCard[] = [];
    const seenExternalIds = new Set<string>();

    for (const query of SEARCH_QUERIES) {
        const reachedLimit = await collectCardsForQuery({
            query,
            maxPages,
            allCards,
            seenExternalIds,
            limit,
        });

        if (reachedLimit) {
            return allCards.slice(0, limit);
        }
    }

    return allCards.slice(0, limit);
}

export async function fetchFromLinkedIn(limit = 80): Promise<RawSourceJob[]> {
    const maxPages = Number(process.env.JOBS_LINKEDIN_MAX_PAGES ?? '2');

    if (Number.isNaN(maxPages) || maxPages <= 0) {
        return [];
    }

    try {
        const selectedCards = await collectLinkedInCards(limit, maxPages);
        const mappedJobs = await mapCardsWithConcurrency(selectedCards);

        return mappedJobs.slice(0, limit);
    } catch {
        return [];
    }
}
