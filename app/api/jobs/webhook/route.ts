import { JobSource, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { buildJobFingerprint } from '@/app/lib/jobs/dedupe';
import { normalizeLocation } from '@/app/lib/jobs/normalizers';
import { curateJobData } from '@/app/lib/jobs/curation';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

const sourceEnum = z.enum(['LINKEDIN', 'GUPY', 'COMPANY_SITE', 'OTHER']);

const incomingJobSchema = z.object({
    title: z.string().min(2),
    companyName: z.string().min(2),
    sourceUrl: z.url(),
    level: z.string().optional().nullable(),
    stack: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    publishedAt: z.string().optional().nullable(),
    source: sourceEnum.optional().default('OTHER'),
    externalId: z.string().optional().nullable(),
    connectorName: z.string().optional().nullable(),
});

const webhookPayloadSchema = z.object({
    jobs: z.array(incomingJobSchema).min(1),
    runId: z.string().optional(),
    sentAt: z.string().optional(),
});

function isAuthorized(request: NextRequest) {
    const webhookSecret = process.env.JOBS_WEBHOOK_SECRET;
    const bootstrapSecret = process.env.JOBS_BOOTSTRAP_SECRET;

    const providedSecret = request.headers.get('x-webhook-secret')
        ?? request.headers.get('authorization')?.replace('Bearer ', '');

    const acceptedSecrets = [webhookSecret, bootstrapSecret].filter(
        (value): value is string => Boolean(value),
    );

    if (acceptedSecrets.length === 0) {
        return {
            ok: false,
            status: 500,
            message: 'Nenhum segredo para webhook está configurado (JOBS_WEBHOOK_SECRET/JOBS_BOOTSTRAP_SECRET).',
        };
    }

    if (!providedSecret || !acceptedSecrets.includes(providedSecret)) {
        return { ok: false, status: 401, message: 'Não autorizado.' };
    }

    return { ok: true as const };
}

function normalizeSourceUrl(value: string): string | null {
    try {
        const parsed = new URL(value);
        return parsed.toString();
    } catch {
        return null;
    }
}

function parsePublishedAt(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function toJobSource(value: z.infer<typeof sourceEnum>): JobSource {
    return value as JobSource;
}

export async function POST(request: NextRequest) {
    const auth = isAuthorized(request);

    if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const parsed = webhookPayloadSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({
            error: 'Payload inválido para webhook de vagas.',
            details: parsed.error.issues,
        }, { status: 400 });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of parsed.data.jobs) {
        const sourceUrl = normalizeSourceUrl(item.sourceUrl);

        if (!sourceUrl) {
            skippedCount += 1;
            continue;
        }

        const source = toJobSource(item.source);
        const { location, isRemote } = normalizeLocation(item.location);
        const { normalizedStack, normalizedLevel } = await curateJobData({
            title: item.title,
            level: item.level,
            stack: item.stack,
            description: item.description,
        });
        const fingerprint = buildJobFingerprint({
            title: item.title,
            companyName: item.companyName,
            sourceUrl,
        });

        const existingByExternal = item.externalId
            ? await prisma.job.findFirst({
                where: {
                    source,
                    externalId: item.externalId,
                },
                select: { id: true },
            })
            : null;

        const data: Prisma.JobUncheckedCreateInput = {
            title: item.title,
            companyName: item.companyName,
            level: normalizedLevel,
            stack: normalizedStack,
            location,
            isRemote,
            publishedAt: parsePublishedAt(item.publishedAt),
            source,
            sourceUrl,
            externalId: item.externalId ?? null,
            fingerprint,
            lastSeenAt: new Date(),
        };

        if (existingByExternal) {
            await prisma.job.update({
                where: { id: existingByExternal.id },
                data: {
                    ...data,
                    updatedAt: new Date(),
                },
            });
            updatedCount += 1;
            continue;
        }

        const existingByFingerprint = await prisma.job.findUnique({
            where: { fingerprint },
            select: { id: true },
        });

        await prisma.job.upsert({
            where: { fingerprint },
            create: data,
            update: {
                ...data,
                updatedAt: new Date(),
            },
        });

        if (existingByFingerprint) {
            updatedCount += 1;
        } else {
            insertedCount += 1;
        }
    }

    return NextResponse.json({
        message: 'Webhook processado com sucesso.',
        runId: parsed.data.runId ?? null,
        receivedCount: parsed.data.jobs.length,
        insertedCount,
        updatedCount,
        skippedCount,
    });
}
