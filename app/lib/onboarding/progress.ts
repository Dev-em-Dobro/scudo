import { OnboardingStatus } from '@prisma/client';

import { prisma } from '@/app/lib/prisma';
import type { OnboardingTutorial } from '@/app/lib/onboarding/tutorials';

export interface TutorialProgressView {
  status: OnboardingStatus;
  currentStep: number;
}

function clampStep(step: number, maxIndex: number) {
  if (maxIndex <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(step, maxIndex));
}

export async function getTutorialProgress(userId: string, tutorial: OnboardingTutorial): Promise<TutorialProgressView> {
  const existing = await prisma.userOnboardingProgress.findUnique({
    where: {
      userId_tutorialKey_tutorialVersion: {
        userId,
        tutorialKey: tutorial.key,
        tutorialVersion: tutorial.version,
      },
    },
    select: {
      status: true,
      currentStep: true,
    },
  });

  if (!existing) {
    return {
      status: OnboardingStatus.NOT_STARTED,
      currentStep: 0,
    };
  }

  return {
    status: existing.status,
    currentStep: clampStep(existing.currentStep, Math.max(0, tutorial.steps.length - 1)),
  };
}

export async function startTutorial(userId: string, tutorial: OnboardingTutorial) {
  await prisma.userOnboardingProgress.upsert({
    where: {
      userId_tutorialKey_tutorialVersion: {
        userId,
        tutorialKey: tutorial.key,
        tutorialVersion: tutorial.version,
      },
    },
    update: {
      status: OnboardingStatus.IN_PROGRESS,
      startedAt: new Date(),
      skippedAt: null,
      completedAt: null,
      currentStep: 0,
    },
    create: {
      userId,
      tutorialKey: tutorial.key,
      tutorialVersion: tutorial.version,
      status: OnboardingStatus.IN_PROGRESS,
      startedAt: new Date(),
      currentStep: 0,
    },
  });
}

export async function setTutorialStep(userId: string, tutorial: OnboardingTutorial, step: number) {
  const safeStep = clampStep(step, Math.max(0, tutorial.steps.length - 1));

  await prisma.userOnboardingProgress.upsert({
    where: {
      userId_tutorialKey_tutorialVersion: {
        userId,
        tutorialKey: tutorial.key,
        tutorialVersion: tutorial.version,
      },
    },
    update: {
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: safeStep,
      startedAt: new Date(),
      skippedAt: null,
    },
    create: {
      userId,
      tutorialKey: tutorial.key,
      tutorialVersion: tutorial.version,
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: safeStep,
      startedAt: new Date(),
    },
  });
}

export async function completeTutorial(userId: string, tutorial: OnboardingTutorial) {
  await prisma.userOnboardingProgress.upsert({
    where: {
      userId_tutorialKey_tutorialVersion: {
        userId,
        tutorialKey: tutorial.key,
        tutorialVersion: tutorial.version,
      },
    },
    update: {
      status: OnboardingStatus.COMPLETED,
      completedAt: new Date(),
      skippedAt: null,
      currentStep: Math.max(0, tutorial.steps.length - 1),
    },
    create: {
      userId,
      tutorialKey: tutorial.key,
      tutorialVersion: tutorial.version,
      status: OnboardingStatus.COMPLETED,
      completedAt: new Date(),
      currentStep: Math.max(0, tutorial.steps.length - 1),
    },
  });
}

export async function skipTutorial(userId: string, tutorial: OnboardingTutorial) {
  await prisma.userOnboardingProgress.upsert({
    where: {
      userId_tutorialKey_tutorialVersion: {
        userId,
        tutorialKey: tutorial.key,
        tutorialVersion: tutorial.version,
      },
    },
    update: {
      status: OnboardingStatus.SKIPPED,
      skippedAt: new Date(),
    },
    create: {
      userId,
      tutorialKey: tutorial.key,
      tutorialVersion: tutorial.version,
      status: OnboardingStatus.SKIPPED,
      skippedAt: new Date(),
      currentStep: 0,
    },
  });
}
