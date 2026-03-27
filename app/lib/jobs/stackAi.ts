import { normalizeStack } from '@/app/lib/jobs/normalizers';

type EnrichStackParams = {
    title: string;
    description: string;
    baseStack: string[];
};

function parseJsonArrayFromText(text: string): string[] {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start < 0 || end <= start) {
        return [];
    }

    const snippet = text.slice(start, end + 1);
    try {
        const parsed = JSON.parse(snippet);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
        return [];
    }
}

function getAiProvider() {
    return (process.env.JOBS_AI_PROVIDER ?? 'gemini').toLowerCase();
}

async function callGemini(prompt: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.JOBS_AI_MODEL ?? process.env.JOBS_STACK_AI_MODEL ?? 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                topP: 0.9,
                maxOutputTokens: 300,
                responseMimeType: 'application/json',
            },
        }),
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json() as {
        candidates?: Array<{
            content?: {
                parts?: Array<{ text?: string }>;
            };
        }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callOpenAi(prompt: string): Promise<string | null> {
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
            temperature: 0.1,
            messages: [
                { role: 'system', content: 'Retorne apenas JSON válido.' },
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

    return data.choices?.[0]?.message?.content ?? null;
}

export async function enrichStackWithAi(params: EnrichStackParams): Promise<string[]> {
    if (process.env.JOBS_STACK_AI_ENRICHMENT !== 'true') {
        return params.baseStack;
    }

    const prompt = [
        'Extraia APENAS tecnologias e conhecimentos tecnicos de uma vaga.',
        'Retorne estritamente um JSON array de strings em minusculas.',
        'Nao inclua explicacoes, sem markdown.',
        'Mantenha termos canonicos curtos, ex: "node", "aws", "sql", "n8n", "make", "openai", "llm", "langchain".',
        `Titulo: ${params.title}`,
        `Descricao: ${params.description}`,
        `Stack base atual: ${JSON.stringify(params.baseStack)}`,
    ].join('\n');

    try {
        const provider = getAiProvider();
        const text = provider === 'openai'
            ? await callOpenAi(prompt)
            : await callGemini(prompt);
        if (!text) {
            return params.baseStack;
        }
        const aiStack = parseJsonArrayFromText(text);
        const combined = normalizeStack([...params.baseStack, ...aiStack]);
        return combined.slice(0, 20);
    } catch {
        return params.baseStack;
    }
}

