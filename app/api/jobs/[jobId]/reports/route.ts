import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { JOB_REPORT_REASONS, queueJobReport } from '@/app/lib/jobs/reportQueue';

export const runtime = 'nodejs';

const reportReasonSchema = z.enum(JOB_REPORT_REASONS);

const jobParamsSchema = z.object({
    jobId: z.string().min(1),
});

const reportBodySchema = z.object({
    reason: reportReasonSchema,
});

type RouteContext = {
    params: Promise<{
        jobId: string;
    }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { jobId } = jobParamsSchema.parse(await context.params);
    const rawBody = await request.json().catch(() => null);
    const parsedBody = reportBodySchema.safeParse(rawBody);

    if (!parsedBody.success) {
        return NextResponse.json(
            {
                error: 'Dados inválidos.',
                details: parsedBody.error.issues,
            },
            { status: 400 },
        );
    }

    try {
        const result = await queueJobReport({
            userId: session.user.id,
            jobId,
            reason: parsedBody.data.reason,
        });

        if (result.status === 'not_found') {
            return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
        }

        if (result.status === 'inactive') {
            return NextResponse.json({ error: 'Essa vaga já foi inativada.' }, { status: 409 });
        }

        if (result.status === 'duplicate') {
            return NextResponse.json(
                {
                    error: 'Você já reportou esta vaga recentemente. Aguarde alguns minutos para tentar novamente.',
                    reviewAfterAt: result.reviewAfterAt,
                },
                { status: 429 },
            );
        }

        return NextResponse.json({
            ok: true,
            message: 'Reporte registrado. A vaga será reavaliada em até 15 minutos.',
            report: {
                id: result.reportId,
                jobTitle: result.jobTitle,
                companyName: result.companyName,
                reviewAfterAt: result.reviewAfterAt,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2021' || error.code === 'P2022')) {
            return NextResponse.json(
                {
                    error: 'Funcionalidade de reporte em atualização. Tente novamente em instantes.',
                },
                { status: 503 },
            );
        }

        console.error('Falha ao registrar reporte de vaga.', error);
        return NextResponse.json(
            { error: 'Não foi possível registrar o reporte agora. Tente novamente em instantes.' },
            { status: 500 },
        );
    }
}