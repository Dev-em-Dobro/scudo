import type { JobLevel } from '@prisma/client';

import { enrichStackWithAi } from '@/app/lib/jobs/stackAi';
import { inferStackFromText, normalizeLevel, normalizeStack } from '@/app/lib/jobs/normalizers';
import { inferLevelWithAi } from '@/app/lib/jobs/levelAi';

type CurateJobInput = {
    title: string;
    level?: string | null;
    stack?: string[] | string | null;
    description?: string | null;
};

type CurateJobResult = {
    normalizedStack: string[];
    normalizedLevel: JobLevel;
};

function inferLevelByYearsRule(text: string): JobLevel | null {
    // Matches patterns like "3+ years", "mínimo 2 anos", "at least 5 years".
    const yearRegex = /(?:at\s+least\s+|minimum\s+|m[ií]nimo\s+de?\s*)?(\d{1,2})\s*\+?\s*(?:years?|anos?)/gi;

    let minYears: number | null = null;
    let match: RegExpExecArray | null;
    while ((match = yearRegex.exec(text)) !== null) {
        const years = Number(match[1]);
        if (Number.isNaN(years)) continue;
        if (minYears === null || years > minYears) {
            minYears = years;
        }
    }

    if (minYears === null) return null;
    if (minYears <= 1) return 'JUNIOR';
    if (minYears <= 2) return 'JUNIOR';
    if (minYears <= 4) return 'PLENO';
    return 'SENIOR';
}

function inferLevelByRoleKeywords(text: string): JobLevel | null {
    const lower = text.toLowerCase();

    if (/intern|est[aá]gio|trainee/.test(lower)) return 'ESTAGIO';
    if (/j[uú]nior|junior|\bjr\b|associate|entry[-\s]?level/.test(lower)) return 'JUNIOR';
    if (/pleno|mid|middle|\bii\b/.test(lower)) return 'PLENO';
    if (/s[eê]nior|senior|\bsr\b|lead|staff|principal|\biii\b/.test(lower)) return 'SENIOR';

    return null;
}

function inferLevelByRules(input: CurateJobInput): JobLevel | null {
    const joined = `${input.title} ${input.level ?? ''} ${input.description ?? ''}`.trim();
    if (!joined) return null;

    const byYears = inferLevelByYearsRule(joined);
    if (byYears) return byYears;

    return inferLevelByRoleKeywords(joined);
}

export async function curateJobData(input: CurateJobInput): Promise<CurateJobResult> {
    const baseStack = normalizeStack([
        ...normalizeStack(input.stack),
        ...inferStackFromText(input.title),
        ...(input.description ? inferStackFromText(input.description) : []),
    ]);

    const normalizedStack = input.description
        ? await enrichStackWithAi({
            title: input.title,
            description: input.description,
            baseStack,
        })
        : baseStack;

    const deterministicLevel = normalizeLevel(input.level);
    const levelFromRules = inferLevelByRules(input);

    let normalizedLevel: JobLevel = deterministicLevel;
    if (levelFromRules && normalizedLevel === 'OUTRO') {
        normalizedLevel = levelFromRules;
    }

    // AI only as a second opinion when still ambiguous.
    if (normalizedLevel === 'OUTRO' && input.description) {
        const aiLevel = await inferLevelWithAi({
            title: input.title,
            description: input.description,
        });
        if (aiLevel) {
            normalizedLevel = aiLevel;
        }
    }

    return {
        normalizedStack: normalizeStack(normalizedStack),
        normalizedLevel,
    };
}

