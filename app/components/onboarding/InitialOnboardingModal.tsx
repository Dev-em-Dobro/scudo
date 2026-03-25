"use client";

import { useEffect, useMemo, useState } from 'react';

import type { OnboardingTutorial } from '@/app/lib/onboarding/tutorials';

type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

type OnboardingResponse = {
    enabled: boolean;
    tutorial?: OnboardingTutorial;
    progress?: {
        status: OnboardingStatus;
        currentStep: number;
    };
    shouldShow?: boolean;
};

type OnboardingAction = 'start' | 'set-step' | 'complete' | 'skip';

function clampStep(step: number, total: number) {
    if (total <= 0) {
        return 0;
    }

    return Math.max(0, Math.min(step, total - 1));
}

export default function InitialOnboardingModal() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payload, setPayload] = useState<OnboardingResponse | null>(null);
    const [mode, setMode] = useState<'welcome' | 'tutorial'>('welcome');

    useEffect(() => {
        let isActive = true;

        async function loadOnboarding() {
            try {
                const response = await fetch('/api/onboarding', {
                    method: 'GET',
                    cache: 'no-store',
                    credentials: 'include',
                });

                if (!response.ok || !isActive) {
                    return;
                }

                const data = (await response.json()) as OnboardingResponse;
                setPayload(data);

                if (data.progress?.status === 'IN_PROGRESS') {
                    setMode('tutorial');
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        void loadOnboarding();

        return () => {
            isActive = false;
        };
    }, []);

    const tutorial = payload?.tutorial;
    const shouldShow = Boolean(payload?.enabled && payload?.shouldShow && tutorial);
    const totalSteps = tutorial?.steps.length ?? 0;
    const currentStep = useMemo(() => {
        const rawStep = payload?.progress?.currentStep ?? 0;
        return clampStep(rawStep, totalSteps);
    }, [payload?.progress?.currentStep, totalSteps]);

    async function submitAction(action: OnboardingAction, step?: number) {
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/onboarding', {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, step }),
            });

            if (!response.ok) {
                return;
            }

            const data = (await response.json()) as {
                progress: {
                    status: OnboardingStatus;
                    currentStep: number;
                };
                shouldShow: boolean;
            };

            setPayload((previous) => {
                if (!previous) {
                    return previous;
                }

                return {
                    ...previous,
                    progress: data.progress,
                    shouldShow: data.shouldShow,
                };
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleStart() {
        await submitAction('start');
        setMode('tutorial');
    }

    async function handlePrevious() {
        const previousStep = clampStep(currentStep - 1, totalSteps);
        await submitAction('set-step', previousStep);
    }

    async function handleNext() {
        const isLastStep = currentStep >= totalSteps - 1;

        if (isLastStep) {
            await submitAction('complete');
            return;
        }

        const nextStep = clampStep(currentStep + 1, totalSteps);
        await submitAction('set-step', nextStep);
    }

    async function handleSkip() {
        await submitAction('skip');
    }

    if (isLoading || !shouldShow || !tutorial || !payload?.progress) {
        return null;
    }

    const activeStep = tutorial.steps[currentStep];

    return (
        <dialog
            open
            aria-labelledby="onboarding-title"
            className="fixed inset-0 z-70 m-0 h-dvh w-screen max-h-none max-w-none border-0 bg-slate-950/80 p-0 backdrop-blur-[2px]"
        >
            <div className="flex min-h-full items-end justify-center px-3 py-4 sm:items-center sm:px-6">
                <div className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto rounded-xl sm:rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark shadow-2xl">
                    <div className="px-6 py-5 border-b border-border-light dark:border-border-dark bg-linear-to-r from-primary/20 via-primary/10 to-transparent">
                        <h2 id="onboarding-title" className="text-xl font-bold text-white tracking-tight">
                            {tutorial.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-300">{tutorial.description}</p>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        {mode === 'welcome' ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-300">
                                    Esse guia rápido ajuda você a entender o caminho ideal para começar. Você pode pular agora e voltar depois.
                                </p>
                                <p className="text-xs text-slate-400">
                                    Dica: quando o tutorial em vídeo estiver disponível, ele aparecerá como um passo desta experiência.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                        Passo {currentStep + 1} de {totalSteps}
                                    </p>
                                    <p className="text-xs text-slate-400">{activeStep.type === 'video' ? 'Etapa de vídeo' : 'Etapa de orientação'}</p>
                                </div>

                                <div className="h-1.5 rounded-full bg-slate-800/70 overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${((currentStep + 1) / Math.max(totalSteps, 1)) * 100}%` }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-base font-semibold text-white">{activeStep.title}</h3>
                                    <p className="text-sm text-slate-300">{activeStep.description}</p>

                                    {activeStep.type === 'video' && (
                                        <div className="rounded-lg border border-dashed border-border-light dark:border-border-dark p-3 text-xs text-slate-400">
                                            {activeStep.videoUrl ? (
                                                <a href={activeStep.videoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                    Assistir vídeo explicativo
                                                </a>
                                            ) : (
                                                <span>Vídeo ainda não publicado. Este passo já está preparado para receber a gravação.</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => void handleSkip()}
                            disabled={isSubmitting}
                            className="cursor-pointer text-sm font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Pular por agora
                        </button>

                        {mode === 'welcome' ? (
                            <button
                                type="button"
                                onClick={() => void handleStart()}
                                disabled={isSubmitting}
                                className="cursor-pointer inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Começar tutorial
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => void handlePrevious()}
                                    disabled={isSubmitting || currentStep === 0}
                                    className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-border-light dark:border-border-dark px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleNext()}
                                    disabled={isSubmitting}
                                    className="cursor-pointer inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {currentStep >= totalSteps - 1 ? 'Concluir' : 'Próximo'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </dialog>
    );
}
