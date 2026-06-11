import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { registerJobApplication } from '@/app/lib/jobs/apply';

export const runtime = 'nodejs';

const jobParamsSchema = z.object({
  jobId: z.string().min(1),
});

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { jobId } = jobParamsSchema.parse(await context.params);

  try {
    const result = await registerJobApplication({
      userId: session.user.id,
      jobId,
    });

    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
    }

    if (result.status === 'inactive') {
      return NextResponse.json({ error: 'Essa vaga está indisponível no momento.' }, { status: 409 });
    }

    if (result.status === 'already_applied') {
      return NextResponse.json({
        ok: true,
        alreadyApplied: true,
        message: 'Candidatura já registrada para essa vaga.',
        appliedAt: result.appliedAt,
      });
    }

    return NextResponse.json({
      ok: true,
      alreadyApplied: false,
      message: 'Candidatura registrada com sucesso.',
      appliedAt: result.appliedAt,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2021' || error.code === 'P2022')) {
      return NextResponse.json(
        {
          error: 'Funcionalidade de candidatura em atualização. Tente novamente em instantes.',
        },
        { status: 503 },
      );
    }

    console.error('Falha ao registrar candidatura em vaga.', error);

    return NextResponse.json(
      { error: 'Não foi possível registrar a candidatura agora. Tente novamente em instantes.' },
      { status: 500 },
    );
  }
}
