import { extractSkillsSectionFromText } from '@/app/lib/jobs/extractSkillsSection';

function decodeHtmlEntities(value: string) {
    return value
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
}

function normalizeWhitespace(value: string) {
    return value.replace(/\s+/g, ' ').trim();
}

function stripScriptsStylesAndTags(html: string) {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]*>/g, ' ');
}

function collectJsonLdDescriptions(value: unknown, acc: string[]) {
    if (!value) {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => collectJsonLdDescriptions(item, acc));
        return;
    }

    if (typeof value !== 'object') {
        return;
    }

    const node = value as Record<string, unknown>;
    const typeValue = Array.isArray(node['@type']) ? node['@type'].join(' ') : String(node['@type'] ?? '');
    const isJobPosting = typeValue.toLowerCase().includes('jobposting');
    const description = node.description;

    if (isJobPosting && typeof description === 'string') {
        acc.push(description);
    }

    Object.values(node).forEach((item) => collectJsonLdDescriptions(item, acc));
}

function extractJsonLdDescriptions(html: string) {
    const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    const descriptions: string[] = [];

    for (const match of matches) {
        const raw = match[1]?.trim();
        if (!raw) {
            continue;
        }
        try {
            const parsed = JSON.parse(raw) as unknown;
            collectJsonLdDescriptions(parsed, descriptions);
        } catch {
            // Ignore malformed JSON-LD blocks.
        }
    }

    return descriptions;
}

function pickMostRelevantText(text: string, maxLen: number) {
    const cleaned = normalizeWhitespace(decodeHtmlEntities(text));
    if (!cleaned) {
        return '';
    }

    const focused = extractSkillsSectionFromText(cleaned);
    if (focused && focused.length >= 120) {
        return focused.slice(0, maxLen);
    }

    return cleaned.slice(0, maxLen);
}

export function extractRelevantDescriptionFromHtml(html: string, maxLen = 8000) {
    if (!html) {
        return '';
    }

    const descriptions = extractJsonLdDescriptions(html);
    if (descriptions.length > 0) {
        const best = descriptions.sort((a, b) => b.length - a.length)[0] ?? '';
        return pickMostRelevantText(best, maxLen);
    }

    const plainText = stripScriptsStylesAndTags(html);
    return pickMostRelevantText(plainText, maxLen);
}

export function normalizeDescriptionText(text: string, maxLen = 8000) {
    return pickMostRelevantText(text, maxLen);
}

export async function fetchAndExtractJobDescription(sourceUrl: string, maxLen = 8000) {
    try {
        const response = await fetch(sourceUrl, {
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'User-Agent': 'Scudo/1.0 (+job-aggregator)',
            },
            signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
            return '';
        }

        const html = await response.text();
        return extractRelevantDescriptionFromHtml(html, maxLen);
    } catch {
        return '';
    }
}

