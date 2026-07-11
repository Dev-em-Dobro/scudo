import { NextResponse } from 'next/server';

export type RateLimitRule = {
    windowMs: number;
    maxRequests: number;
};

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

export type RateLimitResult =
    | { allowed: true; remaining: number; resetAt: number }
    | { allowed: false; retryAfterSeconds: number; resetAt: number };

const globalStore = globalThis as unknown as {
    scudoRateLimitStore?: Map<string, RateLimitEntry>;
    scudoRateLimitLastPruneAt?: number;
};

const store = globalStore.scudoRateLimitStore ?? new Map<string, RateLimitEntry>();
globalStore.scudoRateLimitStore ??= store;

const PRUNE_INTERVAL_MS = 5 * 60_000;

/** Limites pensados para ~500 usuários em instância serverless (memória por processo). */
export const RATE_LIMIT_RULES = {
    /** Toggle de tarefas na jornada — uso intenso legítimo ao marcar várias tarefas seguidas. */
    jornadaTaskToggle: { windowMs: 60_000, maxRequests: 120 },
    /** Sync manual com API externa da Curseduca. */
    jornadaCurseducaSync: { windowMs: 5 * 60_000, maxRequests: 3 },
    /** Sync de exercícios CodeQuest na jornada. */
    jornadaCodequestSync: { windowMs: 60_000, maxRequests: 10 },
    /** Atualização de perfil (PATCH). */
    profilePatch: { windowMs: 60_000, maxRequests: 20 },
    /** Salvar currículo ATS gerado (regenera PDF). */
    generatedResumeSave: { windowMs: 60_000, maxRequests: 10 },
    /** Carregar documento do currículo gerado. */
    generatedResumeRead: { windowMs: 60_000, maxRequests: 30 },
    /** Download do PDF do currículo gerado. */
    generatedResumePdfDownload: { windowMs: 60_000, maxRequests: 15 },
    /** Upload e extração de currículo manual (IA + parsing). */
    profileResumeUpload: { windowMs: 5 * 60_000, maxRequests: 3 },
    /** Validação de acesso de aluno (IP + e-mail). */
    studentAccess: { windowMs: 60_000, maxRequests: 5 },
} as const satisfies Record<string, RateLimitRule>;

function maybePruneExpired(now: number) {
    const lastPruneAt = globalStore.scudoRateLimitLastPruneAt ?? 0;
    if (now - lastPruneAt < PRUNE_INTERVAL_MS) {
        return;
    }

    globalStore.scudoRateLimitLastPruneAt = now;

    for (const [key, entry] of store) {
        if (now >= entry.resetAt) {
            store.delete(key);
        }
    }
}

export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
    const now = Date.now();
    maybePruneExpired(now);

    const current = store.get(key);

    if (!current || now >= current.resetAt) {
        const resetAt = now + rule.windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: rule.maxRequests - 1, resetAt };
    }

    if (current.count >= rule.maxRequests) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
            resetAt: current.resetAt,
        };
    }

    store.set(key, {
        ...current,
        count: current.count + 1,
    });

    return {
        allowed: true,
        remaining: rule.maxRequests - current.count - 1,
        resetAt: current.resetAt,
    };
}

export function checkUserRateLimit(
    userId: string,
    bucket: keyof typeof RATE_LIMIT_RULES,
    rule: RateLimitRule = RATE_LIMIT_RULES[bucket],
): RateLimitResult {
    return checkRateLimit(`${bucket}:user:${userId}`, rule);
}

export function rateLimitResponse(result: Extract<RateLimitResult, { allowed: false }>) {
    return NextResponse.json(
        { error: 'Muitas requisições. Aguarde antes de tentar novamente.' },
        {
            status: 429,
            headers: {
                'Retry-After': String(result.retryAfterSeconds),
            },
        },
    );
}

export function getClientIp(request: Request) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
    }

    return request.headers.get('x-real-ip')?.trim() ?? 'unknown';
}
