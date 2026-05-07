import { JobSource } from '@prisma/client';
import { isIP } from 'node:net';

import { JOBS_INGESTION_RLS_USER_ID } from '@/app/lib/jobs/ingestionRls';
import { withRlsUserContext } from '@/app/lib/rls';

const DEFAULT_BATCH_SIZE = 120;
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 500;
const DEFAULT_TIMEOUT_MS = 8_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 20_000;
const DEFAULT_CONCURRENCY = 6;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 15;
const SAMPLE_UNAVAILABLE_SIZE = 20;
const MAX_REDIRECTS = 5;

const FETCH_HEADERS = {
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'Scudo/1.0 (+jobs-unavailability-sweep)',
};

const UNAVAILABLE_HTTP_STATUS = new Set([404, 410, 451]);

const CLOSED_TEXT_SIGNALS = [
    'vaga encerrada',
    'vagas encerradas',
    'vaga fechada',
    'inscricoes encerradas',
    'inscricao encerrada',
    'inscricoes finalizadas',
    'esta vaga nao esta mais disponivel',
    'esta vaga nao esta disponivel',
    'vaga nao esta mais disponivel',
    'nao estamos mais aceitando candidaturas',
    'nao esta aceitando candidaturas',
    'job is no longer available',
    'this job is no longer available',
    'no longer accepting applications',
    'application closed',
    'applications are closed',
    'position has been filled',
    'position filled',
    'job has expired',
    'this posting is closed',
    'vacancy closed',
] as const;

type SweepCandidate = {
    id: string;
    title: string;
    source: JobSource;
    sourceUrl: string;
};

type SweepEvaluationStatus =
    | 'available'
    | 'unavailable_http'
    | 'unavailable_content'
    | 'unknown'
    | 'skipped_unsafe'
    | 'error';

type SweepEvaluation = {
    candidate: SweepCandidate;
    status: SweepEvaluationStatus;
    httpStatus: number | null;
    domain: string | null;
};

type SafeFetchResult =
    | {
        status: 'ok';
        response: Response;
        finalUrl: string;
    }
    | {
        status: 'unsafe_redirect' | 'too_many_redirects' | 'error';
        finalUrl: string | null;
    };

export type RunUnavailabilitySweepOptions = {
    enabled?: boolean;
    dryRun?: boolean;
    batchSize?: number;
    timeoutMs?: number;
    concurrency?: number;
};

export type UnavailabilitySweepResult = {
    enabled: boolean;
    dryRun: boolean;
    batchSize: number;
    timeoutMs: number;
    concurrency: number;
    candidateCount: number;
    checkedCount: number;
    unavailableHttpCount: number;
    unavailableContentCount: number;
    skippedUnsafeCount: number;
    errorCount: number;
    deactivatedCount: number;
    sampledUnavailable: Array<{
        id: string;
        title: string;
        source: JobSource;
        domain: string | null;
        reason: 'source_unavailable_http' | 'source_unavailable_content';
        httpStatus: number | null;
    }>;
    reason?: string;
};

function parseBooleanValue(value: string | undefined, fallback: boolean): boolean {
    if (!value) {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
        return true;
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
        return false;
    }

    return fallback;
}

function parseBoundedInteger(
    value: string | number | undefined,
    fallback: number,
    min: number,
    max: number,
): number {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    const normalized = Math.floor(parsed);

    if (Number.isNaN(normalized) || normalized < min) {
        return fallback;
    }

    return Math.min(normalized, max);
}

function resolveSweepConfig(options: RunUnavailabilitySweepOptions) {
    const envEnabled = parseBooleanValue(process.env.JOBS_UNAVAILABILITY_SWEEP_ENABLED, false);
    const envDryRun = parseBooleanValue(process.env.JOBS_UNAVAILABILITY_SWEEP_DRY_RUN, false);

    return {
        enabled: options.enabled ?? envEnabled,
        dryRun: options.dryRun ?? envDryRun,
        batchSize: parseBoundedInteger(
            options.batchSize ?? process.env.JOBS_UNAVAILABILITY_SWEEP_BATCH_SIZE,
            DEFAULT_BATCH_SIZE,
            MIN_BATCH_SIZE,
            MAX_BATCH_SIZE,
        ),
        timeoutMs: parseBoundedInteger(
            options.timeoutMs ?? process.env.JOBS_UNAVAILABILITY_SWEEP_TIMEOUT_MS,
            DEFAULT_TIMEOUT_MS,
            MIN_TIMEOUT_MS,
            MAX_TIMEOUT_MS,
        ),
        concurrency: parseBoundedInteger(
            options.concurrency ?? process.env.JOBS_UNAVAILABILITY_SWEEP_CONCURRENCY,
            DEFAULT_CONCURRENCY,
            MIN_CONCURRENCY,
            MAX_CONCURRENCY,
        ),
    };
}

function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replaceAll(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function hasClosedSignals(html: string): boolean {
    const normalized = normalizeText(html);
    return CLOSED_TEXT_SIGNALS.some((signal) => normalized.includes(signal));
}

function extractDomain(value: string): string | null {
    try {
        return new URL(value).hostname.toLowerCase();
    } catch {
        return null;
    }
}

function isPrivateIpv4(hostname: string): boolean {
    const parts = hostname.split('.').map(Number);

    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
        return false;
    }

    const [a, b] = parts;

    return (
        a === 10
        || a === 127
        || a === 0
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168)
    );
}

function isPrivateIpv6(hostname: string): boolean {
    const lower = hostname.toLowerCase();

    if (lower === '::1') {
        return true;
    }

    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
        return true;
    }

    if (lower.startsWith('::ffff:')) {
        const mappedIpv4 = lower.replace('::ffff:', '');
        return isPrivateIpv4(mappedIpv4);
    }

    return false;
}

function isSafePublicUrl(sourceUrl: string): boolean {
    let parsed: URL;

    try {
        parsed = new URL(sourceUrl);
    } catch {
        return false;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (
        hostname === 'localhost'
        || hostname.endsWith('.local')
        || hostname.endsWith('.internal')
        || hostname === '0.0.0.0'
    ) {
        return false;
    }

    const ipVersion = isIP(hostname);

    if (ipVersion === 4) {
        return !isPrivateIpv4(hostname);
    }

    if (ipVersion === 6) {
        return !isPrivateIpv6(hostname);
    }

    return true;
}

function isRedirectStatus(status: number): boolean {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function resolveRedirectUrl(currentUrl: string, location: string): string | null {
    try {
        return new URL(location, currentUrl).toString();
    } catch {
        return null;
    }
}

async function fetchWithSafeRedirects(sourceUrl: string, timeoutMs: number): Promise<SafeFetchResult> {
    const startedAt = Date.now();
    let currentUrl = sourceUrl;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        if (!isSafePublicUrl(currentUrl)) {
            return {
                status: 'unsafe_redirect',
                finalUrl: currentUrl,
            };
        }

        const elapsedMs = Date.now() - startedAt;
        const remainingMs = timeoutMs - elapsedMs;

        if (remainingMs <= 0) {
            return {
                status: 'error',
                finalUrl: currentUrl,
            };
        }

        try {
            const response = await fetch(currentUrl, {
                redirect: 'manual',
                signal: AbortSignal.timeout(remainingMs),
                headers: FETCH_HEADERS,
            });

            if (!isRedirectStatus(response.status)) {
                return {
                    status: 'ok',
                    response,
                    finalUrl: currentUrl,
                };
            }

            const location = response.headers.get('location');

            if (!location) {
                return {
                    status: 'error',
                    finalUrl: currentUrl,
                };
            }

            const redirectUrl = resolveRedirectUrl(currentUrl, location);

            if (!redirectUrl) {
                return {
                    status: 'error',
                    finalUrl: currentUrl,
                };
            }

            currentUrl = redirectUrl;
        } catch {
            return {
                status: 'error',
                finalUrl: currentUrl,
            };
        }
    }

    return {
        status: 'too_many_redirects',
        finalUrl: currentUrl,
    };
}

async function evaluateCandidate(candidate: SweepCandidate, timeoutMs: number): Promise<SweepEvaluation> {
    if (!isSafePublicUrl(candidate.sourceUrl)) {
        return {
            candidate,
            status: 'skipped_unsafe',
            httpStatus: null,
            domain: extractDomain(candidate.sourceUrl),
        };
    }

    const fetchResult = await fetchWithSafeRedirects(candidate.sourceUrl, timeoutMs);
    const domain = extractDomain(fetchResult.finalUrl ?? candidate.sourceUrl);

    if (fetchResult.status === 'unsafe_redirect') {
        return {
            candidate,
            status: 'skipped_unsafe',
            httpStatus: null,
            domain,
        };
    }

    if (fetchResult.status !== 'ok') {
        return {
            candidate,
            status: 'error',
            httpStatus: null,
            domain,
        };
    }

    try {
        const { response } = fetchResult;

        if (UNAVAILABLE_HTTP_STATUS.has(response.status)) {
            return {
                candidate,
                status: 'unavailable_http',
                httpStatus: response.status,
                domain,
            };
        }

        if (response.status >= 500 || response.status === 429) {
            return {
                candidate,
                status: 'error',
                httpStatus: response.status,
                domain,
            };
        }

        if (response.status >= 400) {
            return {
                candidate,
                status: 'unknown',
                httpStatus: response.status,
                domain,
            };
        }

        const contentType = (response.headers.get('content-type') ?? '').toLowerCase();

        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
            return {
                candidate,
                status: 'available',
                httpStatus: response.status,
                domain,
            };
        }

        const body = (await response.text()).slice(0, 160_000);

        if (hasClosedSignals(body)) {
            return {
                candidate,
                status: 'unavailable_content',
                httpStatus: response.status,
                domain,
            };
        }

        return {
            candidate,
            status: 'available',
            httpStatus: response.status,
            domain,
        };
    } catch {
        return {
            candidate,
            status: 'error',
            httpStatus: null,
            domain,
        };
    }
}

async function mapWithConcurrency<T, R>(
    values: T[],
    concurrency: number,
    mapper: (value: T) => Promise<R>,
): Promise<R[]> {
    if (values.length === 0) {
        return [];
    }

    const results: R[] = new Array(values.length);
    let index = 0;

    const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
        while (true) {
            const current = index;
            index += 1;

            if (current >= values.length) {
                break;
            }

            results[current] = await mapper(values[current]);
        }
    });

    await Promise.all(workers);
    return results;
}

export async function runUnavailabilitySweep(
    options: RunUnavailabilitySweepOptions = {},
): Promise<UnavailabilitySweepResult> {
    const config = resolveSweepConfig(options);

    if (!config.enabled) {
        return {
            enabled: false,
            dryRun: config.dryRun,
            batchSize: config.batchSize,
            timeoutMs: config.timeoutMs,
            concurrency: config.concurrency,
            candidateCount: 0,
            checkedCount: 0,
            unavailableHttpCount: 0,
            unavailableContentCount: 0,
            skippedUnsafeCount: 0,
            errorCount: 0,
            deactivatedCount: 0,
            sampledUnavailable: [],
            reason: 'unavailability_sweep_disabled',
        };
    }

    const candidates = await withRlsUserContext(
        JOBS_INGESTION_RLS_USER_ID,
        (transaction) => transaction.job.findMany({
            where: {
                isActive: true,
                OR: [
                    { sourceUrl: { startsWith: 'https://' } },
                    { sourceUrl: { startsWith: 'http://' } },
                ],
            },
            orderBy: [{ lastSeenAt: 'asc' }],
            take: config.batchSize,
            select: {
                id: true,
                title: true,
                source: true,
                sourceUrl: true,
            },
        }),
        { timeout: 20_000, maxWait: 10_000 },
    );

    if (candidates.length === 0) {
        return {
            enabled: true,
            dryRun: config.dryRun,
            batchSize: config.batchSize,
            timeoutMs: config.timeoutMs,
            concurrency: config.concurrency,
            candidateCount: 0,
            checkedCount: 0,
            unavailableHttpCount: 0,
            unavailableContentCount: 0,
            skippedUnsafeCount: 0,
            errorCount: 0,
            deactivatedCount: 0,
            sampledUnavailable: [],
            reason: 'no_candidates',
        };
    }

    const evaluations = await mapWithConcurrency(
        candidates,
        config.concurrency,
        (candidate) => evaluateCandidate(candidate, config.timeoutMs),
    );

    const unavailableHttp = evaluations.filter((item) => item.status === 'unavailable_http');
    const unavailableContent = evaluations.filter((item) => item.status === 'unavailable_content');
    const skippedUnsafeCount = evaluations.filter((item) => item.status === 'skipped_unsafe').length;
    const errorCount = evaluations.filter((item) => item.status === 'error').length;
    const checkedCount = evaluations.filter((item) => item.status !== 'skipped_unsafe').length;

    let deactivatedCount = 0;

    if (!config.dryRun) {
        const unavailableHttpIds = unavailableHttp.map((item) => item.candidate.id);
        const unavailableContentIds = unavailableContent.map((item) => item.candidate.id);

        deactivatedCount = await withRlsUserContext(
            JOBS_INGESTION_RLS_USER_ID,
            async (transaction) => {
                const now = new Date();
                let updatedCount = 0;

                if (unavailableHttpIds.length > 0) {
                    const result = await transaction.job.updateMany({
                        where: {
                            id: {
                                in: unavailableHttpIds,
                            },
                            isActive: true,
                        },
                        data: {
                            isActive: false,
                            inactivatedAt: now,
                            inactivationReason: 'source_unavailable_http',
                        },
                    });

                    updatedCount += result.count;
                }

                if (unavailableContentIds.length > 0) {
                    const result = await transaction.job.updateMany({
                        where: {
                            id: {
                                in: unavailableContentIds,
                            },
                            isActive: true,
                        },
                        data: {
                            isActive: false,
                            inactivatedAt: now,
                            inactivationReason: 'source_unavailable_content',
                        },
                    });

                    updatedCount += result.count;
                }

                return updatedCount;
            },
            { timeout: 20_000, maxWait: 10_000 },
        );
    }

    const sampledUnavailable = [...unavailableHttp, ...unavailableContent]
        .slice(0, SAMPLE_UNAVAILABLE_SIZE)
        .map((item) => ({
            id: item.candidate.id,
            title: item.candidate.title,
            source: item.candidate.source,
            domain: item.domain,
            reason: item.status === 'unavailable_http'
                ? 'source_unavailable_http' as const
                : 'source_unavailable_content' as const,
            httpStatus: item.httpStatus,
        }));

    return {
        enabled: true,
        dryRun: config.dryRun,
        batchSize: config.batchSize,
        timeoutMs: config.timeoutMs,
        concurrency: config.concurrency,
        candidateCount: candidates.length,
        checkedCount,
        unavailableHttpCount: unavailableHttp.length,
        unavailableContentCount: unavailableContent.length,
        skippedUnsafeCount,
        errorCount,
        deactivatedCount,
        sampledUnavailable,
    };
}
