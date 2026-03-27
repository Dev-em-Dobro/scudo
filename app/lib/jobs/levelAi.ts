import type { JobLevel } from '@prisma/client';

const LEVEL_MAP: Record<string, JobLevel> = {
    estagio: 'ESTAGIO',
    junior: 'JUNIOR',
    pleno: 'PLENO',
    senior: 'SENIOR',
    outro: 'OUTRO',
};

type InferLevelParams = {
    title: string;
    description: string;
};

function getAiProvider() {
    return (process.env.JOBS_AI_PROVIDER ?? 'gemini').toLowerCase();
}

async function callGeminiLevel(prompt: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.JOBS_AI_MODEL ?? process.env.JOBS_STACK_AI_MODEL ?? 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.0,
                maxOutputTokens: 10,
            },
        }),
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json() as {
        candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
        }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? null;
}

async function callOpenAiLevel(prompt: string): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.JOBS_AI_MODEL ?? 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.0,
            messages: [
                { role: 'system', content: 'Responda com apenas uma palavra dentre: estagio, junior, pleno, senior, outro.' },
                { role: 'user', content: prompt },
            ],
        }),
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json() as {
        choices?: Array<{
            message?: { content?: string | null };
        }>;
    };
    return data.choices?.[0]?.message?.content?.trim().toLowerCase() ?? null;
}

export async function inferLevelWithAi(params: InferLevelParams): Promise<JobLevel | null> {
    if (process.env.JOBS_LEVEL_AI_ENRICHMENT !== 'true') {
        return null;
    }

    const prompt = [
        'Classifique o nivel de experiencia exigido pela vaga.',
        'Responda APENAS com uma das opcoes: estagio, junior, pleno, senior, outro.',
        'Sem explicacoes, sem markdown, somente a palavra.',
        `Titulo: ${params.title}`,
        `Descricao: ${params.description.slice(0, 4000)}`,
    ].join('\n');

    try {
        const provider = getAiProvider();
        const text = provider === 'openai'
            ? await callOpenAiLevel(prompt)
            : await callGeminiLevel(prompt);
        if (!text) {
            return null;
        }
        return LEVEL_MAP[text] ?? null;
    } catch {
        return null;
    }
}
