import { OnboardingStatus } from '@prisma/client';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { isInitialOnboardingEnabled } from '@/app/lib/featureFlags';
import {
  completeTutorial,
  getTutorialProgress,
  setTutorialStep,
  skipTutorial,
  startTutorial,
} from '@/app/lib/onboarding/progress';
import { PLATFORM_INTRO_TUTORIAL } from '@/app/lib/onboarding/tutorials';

export const runtime = 'nodejs';

const onboardingActionSchema = z
  .object({
    action: z.enum(['start', 'set-step', 'complete', 'skip']),
    step: z.number().int().min(0).optional(),
  })
  .strict();

function getShouldShow(status: OnboardingStatus) {
  return status === OnboardingStatus.NOT_STARTED || status === OnboardingStatus.IN_PROGRESS;
}

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const enabled = isInitialOnboardingEnabled();

  if (!enabled) {
    return NextResponse.json({ enabled: false });
  }

  const progress = await getTutorialProgress(session.user.id, PLATFORM_INTRO_TUTORIAL);

  return NextResponse.json({
    enabled: true,
    tutorial: PLATFORM_INTRO_TUTORIAL,
    progress,
    shouldShow: getShouldShow(progress.status),
  });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (!isInitialOnboardingEnabled()) {
    return NextResponse.json({ error: 'Onboarding inicial desativado.' }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = onboardingActionSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos.', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  if (payload.action === 'start') {
    await startTutorial(session.user.id, PLATFORM_INTRO_TUTORIAL);
  }

  if (payload.action === 'set-step') {
    if (payload.step === undefined) {
      return NextResponse.json({ error: 'O campo step é obrigatório para set-step.' }, { status: 400 });
    }

    await setTutorialStep(session.user.id, PLATFORM_INTRO_TUTORIAL, payload.step);
  }

  if (payload.action === 'complete') {
    await completeTutorial(session.user.id, PLATFORM_INTRO_TUTORIAL);
  }

  if (payload.action === 'skip') {
    await skipTutorial(session.user.id, PLATFORM_INTRO_TUTORIAL);
  }

  const progress = await getTutorialProgress(session.user.id, PLATFORM_INTRO_TUTORIAL);

  return NextResponse.json({
    ok: true,
    progress,
    shouldShow: getShouldShow(progress.status),
  });
}
