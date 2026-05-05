import { JobSource } from "@prisma/client";

import { withRlsUserContext, type RlsTransaction } from "@/app/lib/rls";
import { buildJobFingerprint } from "@/app/lib/jobs/dedupe";
import { inferStackFromText, normalizeLocation, normalizeStack } from "@/app/lib/jobs/normalizers";
import { JOBS_INGESTION_RLS_USER_ID } from "@/app/lib/jobs/ingestionRls";
import { fetchFromAdzuna } from "@/app/lib/jobs/sources/adzuna";
import { fetchFromGupy } from "@/app/lib/jobs/sources/gupy";
import { fetchFromProgramathor, fetchProgramathorDetailStackByUrl } from "@/app/lib/jobs/sources/programathor";
import { fetchFromRemotive } from "@/app/lib/jobs/sources/remotive";
import { fetchFromRemoteOk } from "@/app/lib/jobs/sources/remoteok";
import { fetchFromTrampos } from "@/app/lib/jobs/sources/trampos";
import { fetchFromLinkedIn } from "@/app/lib/jobs/sources/linkedin";
import { curateJobData } from "@/app/lib/jobs/curation";
import type { RawSourceJob } from "@/app/lib/jobs/types";

function normalizeSourceUrl(value: string): string | null {
    try {
        const parsed = new URL(value);
        return parsed.toString();
    } catch {
        return null;
    }
}

type PersistResult = "inserted" | "updated" | "skipped";

type PreparedJobForPersistence = {
    title: string;
    companyName: string;
    source: JobSource;
    sourceUrl: string;
    externalId: string | null;
    publishedAt: Date | null;
    location: string | null;
    isRemote: boolean;
    normalizedStack: string[];
    normalizedLevel: Awaited<ReturnType<typeof curateJobData>>["normalizedLevel"];
    fingerprint: string;
};

type SourceMetrics = {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
};

type SourceMetricsMap = Record<JobSource, SourceMetrics>;

const EMPTY_SOURCE_METRICS: SourceMetrics = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
};

function createSourceMetricsMap(): SourceMetricsMap {
    return {
        LINKEDIN: { ...EMPTY_SOURCE_METRICS },
        GUPY: { ...EMPTY_SOURCE_METRICS },
        COMPANY_SITE: { ...EMPTY_SOURCE_METRICS },
        OTHER: { ...EMPTY_SOURCE_METRICS },
    };
}

function resolveRawJobSource(rawJob: RawSourceJob): JobSource {
    return rawJob.source ?? JobSource.GUPY;
}

type ConnectorFlags = {
    gupy: boolean;
    remotive: boolean;
    remoteOk: boolean;
    programathor: boolean;
    trampos: boolean;
    adzuna: boolean;
    linkedIn: boolean;
};

function getConnectorFlags(): ConnectorFlags {
    return {
        gupy: process.env.JOBS_CONNECTOR_GUPY !== "false",
        remotive: process.env.JOBS_CONNECTOR_REMOTIVE === "true",
        remoteOk: process.env.JOBS_CONNECTOR_REMOTEOK === "true",
        programathor: process.env.JOBS_CONNECTOR_PROGRAMATHOR === "true",
        trampos: process.env.JOBS_CONNECTOR_TRAMPOS === "true",
        adzuna: process.env.JOBS_CONNECTOR_ADZUNA === "true",
        linkedIn: process.env.JOBS_CONNECTOR_LINKEDIN === "true",
    };
}

async function fetchConnectorJobs(flags: ConnectorFlags): Promise<RawSourceJob[]> {
    const [gupyJobs, remotiveJobs, remoteOkJobs, programathorJobs, tramposJobs, adzunaJobs, linkedInJobs] = await Promise.all([
        flags.gupy ? fetchFromGupy() : Promise.resolve([]),
        flags.remotive ? fetchFromRemotive() : Promise.resolve([]),
        flags.remoteOk ? fetchFromRemoteOk() : Promise.resolve([]),
        flags.programathor ? fetchFromProgramathor() : Promise.resolve([]),
        flags.trampos ? fetchFromTrampos() : Promise.resolve([]),
        flags.adzuna ? fetchFromAdzuna() : Promise.resolve([]),
        flags.linkedIn ? fetchFromLinkedIn() : Promise.resolve([]),
    ]);

    return [...gupyJobs, ...remotiveJobs, ...remoteOkJobs, ...programathorJobs, ...tramposJobs, ...adzunaJobs, ...linkedInJobs];
}

async function processProgramathorBackfill(): Promise<number> {
    if (process.env.JOBS_PROGRAMATHOR_BACKFILL !== "true") {
        return 0;
    }

    let updatedCount = 0;
    const existingProgramathorJobs = await withRlsUserContext(
        JOBS_INGESTION_RLS_USER_ID,
        async (transaction) => transaction.job.findMany({
            where: {
                source: JobSource.OTHER,
                sourceUrl: {
                    contains: 'programathor.com.br/jobs/',
                },
            },
            select: {
                id: true,
                title: true,
                stack: true,
                sourceUrl: true,
            },
        }),
        { timeout: 20_000, maxWait: 10_000 },
    );

    for (const job of existingProgramathorJobs) {
        const detailStack = await fetchProgramathorDetailStackByUrl(job.sourceUrl);
        const enriched = normalizeStack([
            ...inferStackFromText(job.title),
            ...detailStack,
        ]);

        if (enriched.length === 0) {
            continue;
        }

        const hasChanged = enriched.length !== job.stack.length
            || enriched.some((item, index) => item !== job.stack[index]);

        if (!hasChanged) {
            continue;
        }

        await withRlsUserContext(
            JOBS_INGESTION_RLS_USER_ID,
            async (transaction) => transaction.job.update({
                where: { id: job.id },
                data: {
                    stack: enriched,
                    lastSeenAt: new Date(),
                },
            }),
            { timeout: 20_000, maxWait: 10_000 },
        );
        updatedCount += 1;
    }

    return updatedCount;
}

async function prepareRawJobForPersistence(rawJob: RawSourceJob): Promise<PreparedJobForPersistence | null> {
    const sourceUrl = normalizeSourceUrl(rawJob.sourceUrl);

    if (!sourceUrl) {
        return null;
    }

    const source = rawJob.source ?? JobSource.GUPY;
    const externalId = rawJob.externalId ?? null;
    const publishedAt = rawJob.publishedAt ? new Date(rawJob.publishedAt) : null;
    const { location, isRemote } = normalizeLocation(rawJob.location);
    const { normalizedStack, normalizedLevel } = await curateJobData({
        title: rawJob.title,
        level: rawJob.level,
        stack: rawJob.stack,
        description: rawJob.description,
    });
    const fingerprint = buildJobFingerprint({
        title: rawJob.title,
        companyName: rawJob.companyName,
        sourceUrl,
    });

    return {
        title: rawJob.title,
        companyName: rawJob.companyName,
        source,
        sourceUrl,
        externalId,
        publishedAt,
        location,
        isRemote,
        normalizedStack,
        normalizedLevel,
        fingerprint,
    };
}

async function persistPreparedJob(transaction: RlsTransaction, prepared: PreparedJobForPersistence): Promise<PersistResult> {
    const {
        title,
        companyName,
        source,
        sourceUrl,
        externalId,
        publishedAt,
        location,
        isRemote,
        normalizedStack,
        normalizedLevel,
        fingerprint,
    } = prepared;

    if (externalId) {
        const existingBySourceExternalId = await transaction.job.findUnique({
            where: {
                source_externalId: {
                    source,
                    externalId,
                },
            },
            select: {
                id: true,
            },
        });

        if (existingBySourceExternalId) {
            await transaction.job.update({
                where: {
                    id: existingBySourceExternalId.id,
                },
                data: {
                    title,
                    companyName,
                    level: normalizedLevel,
                    stack: normalizedStack,
                    location,
                    isRemote,
                    publishedAt,
                    source,
                    sourceUrl,
                    externalId,
                    lastSeenAt: new Date(),
                    isActive: true,
                    inactivatedAt: null,
                    inactivationReason: null,
                },
            });

            return "updated";
        }
    }

    const existing = await transaction.job.findUnique({
        where: { fingerprint },
        select: { id: true },
    });

    await transaction.job.upsert({
        where: { fingerprint },
        create: {
            title,
            companyName,
            level: normalizedLevel,
            stack: normalizedStack,
            location,
            isRemote,
            publishedAt,
            source,
            sourceUrl,
            externalId,
            fingerprint,
            lastSeenAt: new Date(),
            isActive: true,
            inactivatedAt: null,
            inactivationReason: null,
        },
        update: {
            title,
            companyName,
            level: normalizedLevel,
            stack: normalizedStack,
            location,
            isRemote,
            publishedAt,
            source,
            sourceUrl,
            externalId,
            lastSeenAt: new Date(),
            isActive: true,
            inactivatedAt: null,
            inactivationReason: null,
        },
    });

    return existing ? "updated" : "inserted";
}

export async function bootstrapInitialJobs() {
    const flags = getConnectorFlags();
    const rawJobs = await fetchConnectorJobs(flags);
    const sourceMetrics = createSourceMetricsMap();

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const rawJob of rawJobs) {
        const source = resolveRawJobSource(rawJob);
        sourceMetrics[source].fetched += 1;

        const prepared = await prepareRawJobForPersistence(rawJob);

        if (!prepared) {
            skippedCount += 1;
            sourceMetrics[source].skipped += 1;
            continue;
        }

        const result = await withRlsUserContext(
            JOBS_INGESTION_RLS_USER_ID,
            async (transaction) => persistPreparedJob(transaction, prepared),
            { timeout: 20_000, maxWait: 10_000 },
        );

        if (result === "inserted") {
            insertedCount += 1;
            sourceMetrics[source].inserted += 1;
        } else if (result === "updated") {
            updatedCount += 1;
            sourceMetrics[source].updated += 1;
        } else {
            skippedCount += 1;
            sourceMetrics[source].skipped += 1;
        }
    }

    const programathorBackfillUpdatedCount = await processProgramathorBackfill();
    updatedCount += programathorBackfillUpdatedCount;

    return {
        fetchedCount: rawJobs.length,
        insertedCount,
        updatedCount,
        skippedCount,
        metrics: {
            sources: sourceMetrics,
            programathorBackfillUpdatedCount,
        },
    };
}
