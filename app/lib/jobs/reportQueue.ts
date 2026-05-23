import { JobReportStatus } from '@prisma/client';

import { JOBS_INGESTION_RLS_USER_ID } from '@/app/lib/jobs/ingestionRls';
import { withRlsUserContext } from '@/app/lib/rls';

export const JOB_REPORT_REVIEW_DELAY_MS = 15 * 60 * 1000;
export const JOB_REPORT_MIN_DISTINCT_REPORTERS = 3;
export const JOB_REPORT_REASONS = ['EXPIRED', 'UNAVAILABLE', 'CANCELLED'] as const;

export type JobReportReasonValue = (typeof JOB_REPORT_REASONS)[number];

type QueueJobReportInput = {
    userId: string;
    jobId: string;
    reason: JobReportReasonValue;
};

export type QueueJobReportResult =
    | {
        status: 'queued';
        reportId: string;
        reviewAfterAt: string;
        jobTitle: string;
        companyName: string;
    }
    | {
        status: 'duplicate';
        reviewAfterAt: string;
    }
    | {
        status: 'not_found';
    }
    | {
        status: 'inactive';
    };

export type ReviewQueuedJobReportsResult = {
    dryRun: boolean;
    processedAt: string;
    dueReportCount: number;
    eligibleJobCount: number;
    inactivatedJobCount: number;
    reviewedReportCount: number;
    threshold: number;
    reviewDelayMs: number;
};

type ReviewQueuedJobReportsOptions = {
    dryRun?: boolean;
};

function getReviewDeadline(): Date {
    return new Date(Date.now() + JOB_REPORT_REVIEW_DELAY_MS);
}

function getDistinctCount(values: Set<string>) {
    return values.size;
}

export async function queueJobReport({ userId, jobId, reason }: QueueJobReportInput): Promise<QueueJobReportResult> {
    const reviewAfterAt = getReviewDeadline();

    return withRlsUserContext(userId, async (transaction) => {
        const job = await transaction.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                title: true,
                companyName: true,
                isActive: true,
            },
        });

        if (!job) {
            return { status: 'not_found' };
        }

        if (!job.isActive) {
            return { status: 'inactive' };
        }

        const recentReport = await transaction.jobReport.findFirst({
            where: {
                userId,
                jobId,
                status: JobReportStatus.PENDING,
                createdAt: {
                    gte: new Date(Date.now() - JOB_REPORT_REVIEW_DELAY_MS),
                },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                reviewAfterAt: true,
            },
        });

        if (recentReport) {
            return {
                status: 'duplicate',
                reviewAfterAt: recentReport.reviewAfterAt.toISOString(),
            };
        }

        const created = await transaction.jobReport.create({
            data: {
                userId,
                jobId,
                reason,
                status: JobReportStatus.PENDING,
                reviewAfterAt,
            },
            select: {
                id: true,
                reviewAfterAt: true,
            },
        });

        return {
            status: 'queued',
            reportId: created.id,
            reviewAfterAt: created.reviewAfterAt.toISOString(),
            jobTitle: job.title,
            companyName: job.companyName,
        };
    });
}

export async function reviewQueuedJobReports(
    options: ReviewQueuedJobReportsOptions = {},
): Promise<ReviewQueuedJobReportsResult> {
    const dryRun = options.dryRun ?? false;

    return withRlsUserContext(
        JOBS_INGESTION_RLS_USER_ID,
        async (transaction) => {
            const processedAt = new Date();

            const dueReports = await transaction.jobReport.findMany({
                where: {
                    status: JobReportStatus.PENDING,
                    reviewAfterAt: {
                        lte: processedAt,
                    },
                },
                select: {
                    id: true,
                    jobId: true,
                    userId: true,
                },
            });

            if (dueReports.length === 0) {
                return {
                    dryRun,
                    processedAt: processedAt.toISOString(),
                    dueReportCount: 0,
                    eligibleJobCount: 0,
                    inactivatedJobCount: 0,
                    reviewedReportCount: 0,
                    threshold: JOB_REPORT_MIN_DISTINCT_REPORTERS,
                    reviewDelayMs: JOB_REPORT_REVIEW_DELAY_MS,
                };
            }

            const buckets = new Map<string, { reportIds: string[]; reporterIds: Set<string> }>();

            for (const report of dueReports) {
                const bucket = buckets.get(report.jobId) ?? {
                    reportIds: [],
                    reporterIds: new Set<string>(),
                };

                bucket.reportIds.push(report.id);
                bucket.reporterIds.add(report.userId);
                buckets.set(report.jobId, bucket);
            }

            const eligibleJobIds = [...buckets.entries()]
                .filter(([, bucket]) => getDistinctCount(bucket.reporterIds) >= JOB_REPORT_MIN_DISTINCT_REPORTERS)
                .map(([jobId]) => jobId);

            if (eligibleJobIds.length === 0) {
                return {
                    dryRun,
                    processedAt: processedAt.toISOString(),
                    dueReportCount: dueReports.length,
                    eligibleJobCount: 0,
                    inactivatedJobCount: 0,
                    reviewedReportCount: 0,
                    threshold: JOB_REPORT_MIN_DISTINCT_REPORTERS,
                    reviewDelayMs: JOB_REPORT_REVIEW_DELAY_MS,
                };
            }

            const eligibleJobs = await transaction.job.findMany({
                where: {
                    id: {
                        in: eligibleJobIds,
                    },
                },
                select: {
                    id: true,
                    isActive: true,
                },
            });

            const activeJobIds = eligibleJobs.filter((job) => job.isActive).map((job) => job.id);
            const inactiveJobIds = eligibleJobs.filter((job) => !job.isActive).map((job) => job.id);

            if (dryRun) {
                return {
                    dryRun: true,
                    processedAt: processedAt.toISOString(),
                    dueReportCount: dueReports.length,
                    eligibleJobCount: eligibleJobIds.length,
                    inactivatedJobCount: 0,
                    reviewedReportCount: 0,
                    threshold: JOB_REPORT_MIN_DISTINCT_REPORTERS,
                    reviewDelayMs: JOB_REPORT_REVIEW_DELAY_MS,
                };
            }

            let inactivatedJobCount = 0;
            let reviewedReportCount = 0;

            if (activeJobIds.length > 0) {
                const updatedJobs = await transaction.job.updateMany({
                    where: {
                        id: {
                            in: activeJobIds,
                        },
                        isActive: true,
                    },
                    data: {
                        isActive: false,
                        inactivatedAt: processedAt,
                        inactivationReason: 'user_reported_unavailable',
                    },
                });

                inactivatedJobCount = updatedJobs.count;

                const updatedReports = await transaction.jobReport.updateMany({
                    where: {
                        jobId: {
                            in: activeJobIds,
                        },
                        status: JobReportStatus.PENDING,
                        reviewAfterAt: {
                            lte: processedAt,
                        },
                    },
                    data: {
                        status: JobReportStatus.INACTIVATED,
                        reviewedAt: processedAt,
                        inactivatedAt: processedAt,
                    },
                });

                reviewedReportCount += updatedReports.count;
            }

            if (inactiveJobIds.length > 0) {
                const updatedReports = await transaction.jobReport.updateMany({
                    where: {
                        jobId: {
                            in: inactiveJobIds,
                        },
                        status: JobReportStatus.PENDING,
                        reviewAfterAt: {
                            lte: processedAt,
                        },
                    },
                    data: {
                        status: JobReportStatus.REVIEWED,
                        reviewedAt: processedAt,
                    },
                });

                reviewedReportCount += updatedReports.count;
            }

            return {
                dryRun: false,
                processedAt: processedAt.toISOString(),
                dueReportCount: dueReports.length,
                eligibleJobCount: eligibleJobIds.length,
                inactivatedJobCount,
                reviewedReportCount,
                threshold: JOB_REPORT_MIN_DISTINCT_REPORTERS,
                reviewDelayMs: JOB_REPORT_REVIEW_DELAY_MS,
            };
        },
        { timeout: 20_000, maxWait: 10_000 },
    );
}