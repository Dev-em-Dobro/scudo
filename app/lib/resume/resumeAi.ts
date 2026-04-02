import type { ExtractedResumeData } from '@/app/lib/resume/extractor';
import { resumeAiExtractionSchema, type ResumeAiExtraction } from '@/app/lib/validations/resumeAi';

export type ResumeAiProvider = 'openai' | 'gemini';

export type ResumeAiStrategy = 'ai' | 'hybrid' | 'fallback';

export type ExtractResumeDataWithAiParams = {
    resumeText: string;
    fallbackData: ExtractedResumeData;
    providers: ResumeAiProvider[];
    confidenceThreshold: number;
    strictPiiSanitization: boolean;
};

export type ExtractResumeDataWithAiResult = {
    data: ExtractedResumeData;
    strategy: ResumeAiStrategy;
    providerUsed: ResumeAiProvider | null;
    fallbackReason: string | null;
};

type ProviderRawResult = {
    raw: unknown;
    reason: string | null;
};

const OPENAI_MODEL = process.env.RESUME_AI_OPENAI_MODEL ?? process.env.JOBS_AI_MODEL ?? 'gpt-4o-mini';
const GEMINI_MODEL = process.env.RESUME_AI_GEMINI_MODEL ?? process.env.JOBS_AI_MODEL ?? 'gemini-1.5-flash';
const AI_TIMEOUT_MS = Number(process.env.RESUME_AI_TIMEOUT_MS ?? '12000');
const AI_MAX_INPUT_CHARS = Number(process.env.RESUME_AI_MAX_INPUT_CHARS ?? '10000');
const AI_PROVIDER_RETRY_COUNT = Number(process.env.RESUME_AI_PROVIDER_RETRY_COUNT ?? '1');

function clampThreshold(value: number) {
    if (!Number.isFinite(value)) {
        return 0.7;
    }
    return Math.min(0.95, Math.max(0.2, value));
}

function uniqueNormalizedList(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function clampInputSize(value: number) {
    if (!Number.isFinite(value)) {
        return 10_000;
    }

    return Math.min(20_000, Math.max(2_000, Math.floor(value)));
}

function clampRetryCount(value: number) {
    if (!Number.isFinite(value)) {
        return 1;
    }

    return Math.min(2, Math.max(0, Math.floor(value)));
}

function sanitizeResumeText(text: string) {
    return text
        .replaceAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]')
        .replaceAll(/\+?\d{1,3}?\s*(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g, '[PHONE]')
        .replaceAll(/https?:\/\/\S+/gi, '[URL]')
        .replaceAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF]')
        .replaceAll(/\s+/g, ' ')
        .trim()
        .slice(0, 16_000);
}

function getPrompt(resumeText: string) {
    return [
        'Você é um extrator de currículo em PT-BR.',
        'Retorne exclusivamente JSON válido, sem markdown e sem texto extra.',
        'Mantenha apenas dados profissionais relevantes.',
        'Quando não souber um campo, retorne null (ou array vazio para listas).',
        'No campo confidence.overall e confidence.fields, use valores entre 0 e 1.',
        'Nunca invente links, nomes ou cidades.',
        'Formato obrigatório:',
        JSON.stringify({
            fullName: null,
            linkedinUrl: null,
            githubUrl: null,
            city: null,
            professionalSummary: null,
            experiences: [],
            knownTechnologies: [],
            projects: [
                {
                    title: 'string',
                    shortDescription: null,
                    technologies: [],
                    deployUrl: null,
                },
            ],
            certifications: [],
            languages: [],
            confidence: {
                overall: 0,
                fields: {
                    fullName: 0,
                    linkedinUrl: 0,
                    githubUrl: 0,
                    city: 0,
                    professionalSummary: 0,
                    experiences: 0,
                    knownTechnologies: 0,
                    projects: 0,
                    certifications: 0,
                    languages: 0,
                },
            },
        }),
        'Currículo (texto bruto):',
        resumeText,
    ].join('\n');
}

function parseJsonObjectFromText(value: string): ProviderRawResult {
    const trimmed = value.trim();

    if (!trimmed) {
        return { raw: null, reason: 'empty_content' };
    }

    try {
        return { raw: JSON.parse(trimmed) as unknown, reason: null };
    } catch {
        // Continue com estratégias de reparo.
    }

    const fencedMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
    const fencedContent = fencedMatch?.[1]?.trim();
    if (fencedContent) {
        try {
            return { raw: JSON.parse(fencedContent) as unknown, reason: null };
        } catch {
            // Continue para extração por balanceamento.
        }
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) {
        return { raw: null, reason: 'invalid_json_no_object' };
    }

    try {
        return { raw: JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown, reason: null };
    } catch {
        return { raw: null, reason: 'invalid_json_parse_error' };
    }
}

function withRetryVariants(prompt: string) {
    const maxChars = clampInputSize(AI_MAX_INPUT_CHARS);
    const attempts = clampRetryCount(AI_PROVIDER_RETRY_COUNT) + 1;

    const variants: string[] = [];
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const divisor = 1 + attempt;
        variants.push(prompt.slice(0, Math.floor(maxChars / divisor)));
    }

    return variants;
}

type SchemaIssueSummary = {
    path: Array<string | number | symbol>;
    code: string;
};

function summarizeSchemaIssues(issues: SchemaIssueSummary[]) {
    return issues
        .slice(0, 3)
        .map((issue) => {
            const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
            return `${path}:${issue.code}`;
        })
        .join(',');
}

async function callOpenAi(prompt: string): Promise<ProviderRawResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return { raw: null, reason: 'missing_api_key' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                temperature: 0,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'Retorne apenas JSON válido.' },
                    { role: 'user', content: prompt },
                ],
            }),
            signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        });

        if (!response.ok) {
            return { raw: null, reason: `http_${response.status}` };
        }

        const payload = await response.json() as {
            choices?: Array<{
                message?: { content?: string | null };
            }>;
        };

        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            return { raw: null, reason: 'empty_content' };
        }

        return parseJsonObjectFromText(content);
    } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
            return { raw: null, reason: 'timeout' };
        }

        return { raw: null, reason: 'network_or_runtime_error' };
    }
}

async function callGemini(prompt: string): Promise<ProviderRawResult> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        return { raw: null, reason: 'missing_api_key' };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 1400,
                    responseMimeType: 'application/json',
                },
            }),
            signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        });

        if (!response.ok) {
            return { raw: null, reason: `http_${response.status}` };
        }

        const payload = await response.json() as {
            candidates?: Array<{
                content?: {
                    parts?: Array<{ text?: string }>;
                };
            }>;
        };

        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return { raw: null, reason: 'empty_content' };
        }

        return parseJsonObjectFromText(text);
    } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
            return { raw: null, reason: 'timeout' };
        }

        return { raw: null, reason: 'network_or_runtime_error' };
    }
}

async function extractWithProvider(provider: ResumeAiProvider, prompt: string): Promise<ProviderRawResult> {
    return provider === 'openai' ? callOpenAi(prompt) : callGemini(prompt);
}

function chooseScalar(
    aiValue: string | null | undefined,
    fallbackValue: string | null,
    confidence: number | undefined,
    threshold: number,
) {
    const aiNormalized = aiValue?.trim() ?? null;
    if (aiNormalized && (confidence ?? 0) >= threshold) {
        return aiNormalized;
    }

    return fallbackValue;
}

function chooseList(
    aiValue: string[],
    fallbackValue: string[],
    confidence: number | undefined,
    threshold: number,
) {
    if ((confidence ?? 0) >= threshold && aiValue.length > 0) {
        return uniqueNormalizedList(aiValue);
    }
    return fallbackValue;
}

function chooseProjects(
    aiValue: ResumeAiExtraction['projects'],
    fallbackValue: ExtractedResumeData['projects'],
    confidence: number | undefined,
    threshold: number,
) {
    if ((confidence ?? 0) >= threshold && aiValue.length > 0) {
        return aiValue
            .filter((project) => project.title.trim().length > 0)
            .map((project) => ({
                title: project.title.trim(),
                shortDescription: project.shortDescription?.trim() ?? null,
                technologies: uniqueNormalizedList(project.technologies),
                deployUrl: project.deployUrl?.trim() ?? null,
            }));
    }

    return fallbackValue;
}

function mergeAiWithFallback(
    ai: ResumeAiExtraction,
    fallbackData: ExtractedResumeData,
    confidenceThreshold: number,
): { data: ExtractedResumeData; strategy: ResumeAiStrategy } {
    const threshold = clampThreshold(confidenceThreshold);
    const fields = ai.confidence.fields;

    const merged: ExtractedResumeData = {
        fullName: chooseScalar(ai.fullName, fallbackData.fullName, fields.fullName, threshold),
        linkedinUrl: chooseScalar(ai.linkedinUrl, fallbackData.linkedinUrl, fields.linkedinUrl, threshold),
        githubUrl: chooseScalar(ai.githubUrl, fallbackData.githubUrl, fields.githubUrl, threshold),
        city: chooseScalar(ai.city, fallbackData.city, fields.city, threshold),
        professionalSummary: chooseScalar(ai.professionalSummary, fallbackData.professionalSummary, fields.professionalSummary, threshold),
        experiences: chooseList(ai.experiences, fallbackData.experiences, fields.experiences, threshold),
        knownTechnologies: chooseList(ai.knownTechnologies, fallbackData.knownTechnologies, fields.knownTechnologies, threshold),
        projects: chooseProjects(ai.projects, fallbackData.projects, fields.projects, threshold),
        certifications: chooseList(ai.certifications, fallbackData.certifications, fields.certifications, threshold),
        languages: chooseList(ai.languages, fallbackData.languages, fields.languages, threshold),
    };

    const usedFallbackForSomeField =
        merged.fullName === fallbackData.fullName
        || merged.linkedinUrl === fallbackData.linkedinUrl
        || merged.githubUrl === fallbackData.githubUrl
        || merged.city === fallbackData.city
        || merged.professionalSummary === fallbackData.professionalSummary
        || merged.experiences === fallbackData.experiences
        || merged.knownTechnologies === fallbackData.knownTechnologies
        || merged.projects === fallbackData.projects
        || merged.certifications === fallbackData.certifications
        || merged.languages === fallbackData.languages;

    if (usedFallbackForSomeField) {
        return { data: merged, strategy: 'hybrid' };
    }

    return { data: merged, strategy: 'ai' };
}

export async function extractResumeDataWithAiFirst(params: ExtractResumeDataWithAiParams): Promise<ExtractResumeDataWithAiResult> {
    const maxChars = clampInputSize(AI_MAX_INPUT_CHARS);
    const promptText = params.strictPiiSanitization
        ? sanitizeResumeText(params.resumeText)
        : params.resumeText.slice(0, maxChars);

    if (!promptText) {
        return {
            data: params.fallbackData,
            strategy: 'fallback',
            providerUsed: null,
            fallbackReason: 'empty_input_after_sanitization',
        };
    }

    const promptVariants = withRetryVariants(promptText).map((value) => getPrompt(value));
    const providerFailures: string[] = [];

    for (const provider of params.providers) {
        for (let attempt = 0; attempt < promptVariants.length; attempt += 1) {
            const providerResult = await extractWithProvider(provider, promptVariants[attempt]);
            if (providerResult.raw === null) {
                providerFailures.push(`${provider}:attempt_${attempt + 1}:${providerResult.reason ?? 'unknown_failure'}`);
                continue;
            }

            const parsed = resumeAiExtractionSchema.safeParse(providerResult.raw);
            if (!parsed.success) {
                const issueSummary = summarizeSchemaIssues(parsed.error.issues);
                providerFailures.push(`${provider}:attempt_${attempt + 1}:schema_validation_failed(${issueSummary})`);
                continue;
            }

            const merged = mergeAiWithFallback(parsed.data, params.fallbackData, params.confidenceThreshold);

            return {
                data: merged.data,
                strategy: merged.strategy,
                providerUsed: provider,
                fallbackReason: merged.strategy === 'hybrid' ? 'partial_confidence' : null,
            };
        }
    }

    const detailedReason = providerFailures.length > 0
        ? `provider_failure_or_invalid_payload:${providerFailures.join('|')}`
        : 'provider_failure_or_invalid_payload';

    return {
        data: params.fallbackData,
        strategy: 'fallback',
        providerUsed: null,
        fallbackReason: detailedReason,
    };
}
