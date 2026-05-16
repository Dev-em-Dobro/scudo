import { NextRequest, NextResponse } from 'next/server';

import { runSoftInactivation } from '@/app/lib/jobs/softInactivation';
import { reviewQueuedJobReports } from '@/app/lib/jobs/reportQueue';
import { runUnavailabilitySweep } from '@/app/lib/jobs/unavailabilitySweep';

export const runtime = 'nodejs';

function isAuthorized(request: NextRequest) {
    const maintenanceSecret = process.env.JOBS_MAINTENANCE_SECRET;
    const bootstrapSecret = process.env.JOBS_BOOTSTRAP_SECRET;
    const cronSecret = process.env.CRON_SECRET;

    const headerSecret = request.headers.get('x-jobs-maintenance-secret');
    const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '');

    const acceptedSecrets = [maintenanceSecret, bootstrapSecret, cronSecret].filter(
        (value): value is string => Boolean(value),
    );

    if (acceptedSecrets.length === 0) {
        return { ok: false, status: 500, message: 'Nenhum segredo de manutenção foi configurado.' };
    }

    const providedSecrets = [headerSecret, bearerToken].filter(
        (value): value is string => Boolean(value),
    );

    const ok = providedSecrets.some((value) => acceptedSecrets.includes(value));

    if (!ok) {
        return { ok: false, status: 401, message: 'Não autorizado.' };
    }

    return { ok: true as const };
}

function parseBooleanParam(value: string | null): boolean | undefined {
    if (!value) {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
        return true;
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
        return false;
    }

    return undefined;
}

function parseIntegerParam(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
        return undefined;
    }

    return Math.floor(parsed);
}

async function handleSoftInactivation(request: NextRequest) {
    const auth = isAuthorized(request);

    if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    try {
        const softInactivation = parseBooleanParam(request.nextUrl.searchParams.get('softInactivation'));
        const dryRun = parseBooleanParam(request.nextUrl.searchParams.get('dryRun'));
        const staleDays = parseIntegerParam(request.nextUrl.searchParams.get('staleDays'));
        const batchSize = parseIntegerParam(request.nextUrl.searchParams.get('batchSize'));
        const unavailabilitySweep = parseBooleanParam(
            request.nextUrl.searchParams.get('unavailabilitySweep'),
        );
        const sweepBatchSize = parseIntegerParam(request.nextUrl.searchParams.get('sweepBatchSize'));
        const sweepTimeoutMs = parseIntegerParam(request.nextUrl.searchParams.get('sweepTimeoutMs'));
        const sweepConcurrency = parseIntegerParam(request.nextUrl.searchParams.get('sweepConcurrency'));

        const softInactivationResult = await runSoftInactivation({
            enabled: softInactivation,
            dryRun,
            staleDays,
            batchSize,
        });
        const unavailabilitySweepResult = await runUnavailabilitySweep({
            enabled: unavailabilitySweep,
            dryRun,
            batchSize: sweepBatchSize,
            timeoutMs: sweepTimeoutMs,
            concurrency: sweepConcurrency,
        });
        const jobReportReviewResult = await reviewQueuedJobReports({
            dryRun: softInactivationResult.dryRun,
        });

        return NextResponse.json({
            message: softInactivationResult.dryRun
                ? 'Dry-run da manutenção de vagas executado com sucesso.'
                : 'Manutenção de vagas executada com sucesso.',
            softInactivation: softInactivationResult,
            unavailabilitySweep: unavailabilitySweepResult,
            jobReportReview: jobReportReviewResult,
        });
    } catch (error) {
        console.error('Erro ao executar manutenção de vagas.', error);
        return NextResponse.json(
            { error: 'Falha ao executar manutenção de vagas.' },
            { status: 500 },
        );
    }
}

export const GET = handleSoftInactivation;
export const POST = handleSoftInactivation;
