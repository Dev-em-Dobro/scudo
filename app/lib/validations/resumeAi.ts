import { z } from 'zod';

const confidenceSchema = z.coerce.number().min(0).max(1);

function normalizeTextCandidate(value: unknown) {
    if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const possibleKeys = [
            'text',
            'description',
            'summary',
            'value',
            'content',
            'title',
            'name',
            'role',
            'position',
            'company',
        ];

        for (const key of possibleKeys) {
            const candidate = record[key];
            if (typeof candidate === 'string') {
                const normalized = candidate.trim();
                if (normalized.length > 0) {
                    return normalized;
                }
            }
        }
    }

    return null;
}

function normalizeTextList(value: unknown, maxItems: number) {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalized = value
        .map((item) => normalizeTextCandidate(item))
        .filter((item): item is string => item !== null);

    return [...new Set(normalized)].slice(0, maxItems);
}

function normalizeHttpUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(trimmed)) {
        return `https://${trimmed}`;
    }

    return trimmed;
}

function isValidHttpUrl(value: string) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

const nullableHttpUrlSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        return normalizeHttpUrl(value);
    })
    .refine((value) => value === null || isValidHttpUrl(value), {
        message: 'URL inválida',
    });

export const resumeAiProjectSchema = z.object({
    title: z.union([z.string(), z.null(), z.undefined()]).transform((value) => typeof value === 'string' ? value.trim() : ''),
    shortDescription: z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }),
    technologies: z.unknown().transform((value) => normalizeTextList(value, 30)).default([]),
    deployUrl: nullableHttpUrlSchema,
});

export const resumeAiFieldConfidenceSchema = z.object({
    fullName: confidenceSchema.optional(),
    linkedinUrl: confidenceSchema.optional(),
    githubUrl: confidenceSchema.optional(),
    city: confidenceSchema.optional(),
    professionalSummary: confidenceSchema.optional(),
    experiences: confidenceSchema.optional(),
    knownTechnologies: confidenceSchema.optional(),
    projects: confidenceSchema.optional(),
    certifications: confidenceSchema.optional(),
    languages: confidenceSchema.optional(),
});

export const resumeAiExtractionSchema = z.object({
    fullName: z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }),
    linkedinUrl: nullableHttpUrlSchema,
    githubUrl: nullableHttpUrlSchema,
    city: z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }),
    professionalSummary: z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }),
    experiences: z.unknown().transform((value) => normalizeTextList(value, 100)).default([]),
    knownTechnologies: z.unknown().transform((value) => normalizeTextList(value, 100)).default([]),
    projects: z.array(resumeAiProjectSchema).max(30).default([]),
    certifications: z.unknown().transform((value) => normalizeTextList(value, 100)).default([]),
    languages: z.unknown().transform((value) => normalizeTextList(value, 50)).default([]),
    confidence: z.object({
        overall: confidenceSchema.default(0),
        fields: resumeAiFieldConfidenceSchema.default({}),
    }).default({ overall: 0, fields: {} }),
});

export type ResumeAiExtraction = z.infer<typeof resumeAiExtractionSchema>;
