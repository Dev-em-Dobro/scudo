import { JobSource } from '@prisma/client';

import { JOBS_INGESTION_RLS_USER_ID } from '@/app/lib/jobs/ingestionRls';
import { withRlsUserContext } from '@/app/lib/rls';

const DEFAULT_STALE_DAYS = 30;
const DEFAULT_BATCH_SIZE = 500;
const MIN_STALE_DAYS = 7;
const MAX_STALE_DAYS = 180;
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 2_000;
const CANDIDATE_SAMPLE_SIZE = 20;

type SoftInactivationRunOptions = {
    dryRun?: boolean;
    staleDays?: number;
    batchSize?: number;
};

type JobCandidate = {
    id: string;
    source: JobSource;
    lastSeenAt: Date;
};

export type SoftInactivationRunResult = {
    enabled: boolean;
    dryRun: boolean;
    staleDays: number;
    batchSize: number;
    cutoffIso: string;
    candidateCount: number;
    updatedCount: number;
    sampledCandidates: Array<{
        id: string;
        source: JobSource;
        lastSeenAt: string;
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

    if (Number.isNaN(normalized)) {
        return fallback;
    }

    if (normalized < min) {
        return fallback;
    }

    return Math.min(normalized, max);
}

function resolveSoftInactivationConfig(options: SoftInactivationRunOptions) {
    const enabled = parseBooleanValue(process.env.JOBS_SOFT_INACTIVATION_ENABLED, true);
    const envDryRun = parseBooleanValue(process.env.JOBS_SOFT_INACTIVATION_DRY_RUN, false);

    const staleDays = parseBoundedInteger(
        options.staleDays ?? process.env.JOBS_SOFT_INACTIVATION_DAYS,
        DEFAULT_STALE_DAYS,
        MIN_STALE_DAYS,
        MAX_STALE_DAYS,
    );

    const batchSize = parseBoundedInteger(
        options.batchSize ?? process.env.JOBS_SOFT_INACTIVATION_BATCH_SIZE,
        DEFAULT_BATCH_SIZE,
        MIN_BATCH_SIZE,
        MAX_BATCH_SIZE,
    );

    const dryRun = options.dryRun ?? envDryRun;

    return {
        enabled,
        dryRun,
        staleDays,
        batchSize,
    };
}

function getCutoffDate(staleDays: number): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleDays);
    return cutoff;
}

function mapSample(candidates: JobCandidate[]) {
    return candidates.slice(0, CANDIDATE_SAMPLE_SIZE).map((candidate) => ({
        id: candidate.id,
        source: candidate.source,
        lastSeenAt: candidate.lastSeenAt.toISOString(),
    }));
}

export async function runSoftInactivation(
    options: SoftInactivationRunOptions = {},
): Promise<SoftInactivationRunResult> {
    const config = resolveSoftInactivationConfig(options);
    const cutoff = getCutoffDate(config.staleDays);

    if (!config.enabled) {
        return {
            enabled: false,
            dryRun: config.dryRun,
            staleDays: config.staleDays,
            batchSize: config.batchSize,
            cutoffIso: cutoff.toISOString(),
            candidateCount: 0,
            updatedCount: 0,
            sampledCandidates: [],
            reason: 'soft_inactivation_disabled',
        };
    }

    return withRlsUserContext(
        JOBS_INGESTION_RLS_USER_ID,
        async (transaction) => {
            const candidates = await transaction.job.findMany({
                where: {
                    isActive: true,
                    lastSeenAt: {
                        lt: cutoff,
                    },
                },
                orderBy: [{ lastSeenAt: 'asc' }],
                take: config.batchSize,
                select: {
                    id: true,
                    source: true,
                    lastSeenAt: true,
                },
            });

            if (candidates.length === 0) {
                return {
                    enabled: true,
                    dryRun: config.dryRun,
                    staleDays: config.staleDays,
                    batchSize: config.batchSize,
                    cutoffIso: cutoff.toISOString(),
                    candidateCount: 0,
                    updatedCount: 0,
                    sampledCandidates: [],
                    reason: 'no_candidates',
                };
            }

            if (config.dryRun) {
                return {
                    enabled: true,
                    dryRun: true,
                    staleDays: config.staleDays,
                    batchSize: config.batchSize,
                    cutoffIso: cutoff.toISOString(),
                    candidateCount: candidates.length,
                    updatedCount: 0,
                    sampledCandidates: mapSample(candidates),
                };
            }

            const candidateIds = candidates.map((candidate) => candidate.id);
            const now = new Date();
            const updated = await transaction.job.updateMany({
                where: {
                    id: {
                        in: candidateIds,
                    },
                    isActive: true,
                },
                data: {
                    isActive: false,
                    inactivatedAt: now,
                    inactivationReason: 'stale_last_seen',
                },
            });

            return {
                enabled: true,
                dryRun: false,
                staleDays: config.staleDays,
                batchSize: config.batchSize,
                cutoffIso: cutoff.toISOString(),
                candidateCount: candidates.length,
                updatedCount: updated.count,
                sampledCandidates: mapSample(candidates),
            };
        },
        { timeout: 120_000, maxWait: 10_000 },
    );
}
