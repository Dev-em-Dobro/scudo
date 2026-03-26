"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Driver } from 'driver.js';
import { usePathname, useRouter } from 'next/navigation';

import type { OnboardingTutorial } from '@/app/lib/onboarding/tutorials';

type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

type OnboardingResponse = {
    enabled: boolean;
    guidedEnabled?: boolean;
    canAccessJornada?: boolean;
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

type GuideStep = {
    element: string;
    route: string;
    popover: {
        title: string;
        description: string;
    };
    stepIndex: number;
};

function getStepRoute(route: string | undefined) {
    return route ?? '/';
}

function isJornadaStep(step: OnboardingTutorial['steps'][number]) {
    return step.route === '/jornada' || step.anchorId === 'nav-jornada' || step.anchorId?.startsWith('jornada-');
}

function isStepAccessible(step: OnboardingTutorial['steps'][number], canAccessJornada: boolean) {
    if (!canAccessJornada && isJornadaStep(step)) {
        return false;
    }

    return true;
}

function findNextAnchoredStep(
    tutorial: OnboardingTutorial,
    fromStepIndex: number,
    canAccessJornada: boolean
) {
    for (let index = fromStepIndex + 1; index < tutorial.steps.length; index += 1) {
        const step = tutorial.steps[index];
        if (!step.anchorId || !isStepAccessible(step, canAccessJornada)) {
            continue;
        }

        return {
            stepIndex: index,
            route: getStepRoute(step.route),
        };
    }

    return null;
}

function findPreviousAnchoredStep(
    tutorial: OnboardingTutorial,
    fromStepIndex: number,
    canAccessJornada: boolean
) {
    for (let index = fromStepIndex - 1; index >= 0; index -= 1) {
        const step = tutorial.steps[index];
        if (!step.anchorId || !isStepAccessible(step, canAccessJornada)) {
            continue;
        }

        return {
            stepIndex: index,
            route: getStepRoute(step.route),
        };
    }

    return null;
}

function findFirstExpectedStepOnRoute(
    tutorial: OnboardingTutorial,
    pathname: string,
    currentStep: number,
    canAccessJornada: boolean
) {
    for (const [index, step] of tutorial.steps.entries()) {
        if (index < currentStep) {
            continue;
        }

        if (!step.anchorId || !isStepAccessible(step, canAccessJornada)) {
            continue;
        }

        if (getStepRoute(step.route) === pathname) {
            return step;
        }
    }

    return null;
}

function scheduleMissingAnchorRetry(retryRef: { current: number }, onRetry: () => void) {
    retryRef.current += 1;
    return setTimeout(onRetry, 150);
}

function clearRetryTimeout(retryTimeout: ReturnType<typeof setTimeout> | null) {
    if (retryTimeout) {
        clearTimeout(retryTimeout);
    }
}

function toRouteGuideSteps(
    tutorial: OnboardingTutorial,
    pathname: string,
    canAccessJornada: boolean,
    minStepIndex = 0
) {
    const mapped: GuideStep[] = [];

    for (const [index, step] of tutorial.steps.entries()) {
        if (index < minStepIndex) {
            continue;
        }

        if (!step.anchorId || !isStepAccessible(step, canAccessJornada)) {
            continue;
        }

        const route = getStepRoute(step.route);
        if (route !== pathname) {
            continue;
        }

        const element = `[data-onboarding-id="${step.anchorId}"]`;
        if (!document.querySelector(element)) {
            continue;
        }

        mapped.push({
            element,
            route,
            stepIndex: index,
            popover: {
                title: step.title,
                description: step.description,
            },
        });
    }

    return mapped;
}

export default function InitialOnboardingModal() {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payload, setPayload] = useState<OnboardingResponse | null>(null);
    const [mode, setMode] = useState<'welcome' | 'tutorial'>('welcome');
    const [anchorRetryTick, setAnchorRetryTick] = useState(0);
    const driverRef = useRef<Driver | null>(null);
    const hasStartedGuidedRef = useRef(false);
    const lastSyncedStepRef = useRef<number | null>(null);
    const destroyReasonRef = useRef<'navigate' | 'complete' | 'skip' | null>(null);
    const canAccessJornadaRef = useRef(false);
    const missingAnchorsRetryRef = useRef(0);

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
    const guidedEnabled = Boolean(payload?.guidedEnabled);
    const canAccessJornada = Boolean(payload?.canAccessJornada);
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
        driverRef.current?.destroy();
        driverRef.current = null;
        await submitAction('skip');
    }

    useEffect(() => {
        return () => {
            driverRef.current?.destroy();
            driverRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (destroyReasonRef.current === 'navigate') {
            destroyReasonRef.current = null;
        }

        missingAnchorsRetryRef.current = 0;
    }, [pathname]);

    useEffect(() => {
        canAccessJornadaRef.current = canAccessJornada;
    }, [canAccessJornada]);

    // SONAR: este efeito concentra a orquestracao multi-rota (driver lifecycle, persistencia e navegacao) para evitar regressoes de estado entre paginas.
    // NOSONAR
    useEffect(() => {
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;

        if (!guidedEnabled || mode !== 'tutorial' || !shouldShow || !tutorial) {
            driverRef.current?.destroy();
            driverRef.current = null;
            return;
        }

        if (driverRef.current || !payload?.progress) {
            return;
        }

        if (payload.progress.status === 'NOT_STARTED' && !hasStartedGuidedRef.current) {
            hasStartedGuidedRef.current = true;
            void submitAction('start');
            return;
        }

        if (payload.progress.status !== 'IN_PROGRESS') {
            return;
        }

        const tutorialForRun = tutorial;
        const canAccessJornadaForRun = canAccessJornadaRef.current;

        const firstExpectedStepOnRoute = findFirstExpectedStepOnRoute(
            tutorialForRun,
            pathname,
            currentStep,
            canAccessJornadaForRun
        );

        if (firstExpectedStepOnRoute?.anchorId) {
            const firstExpectedSelector = `[data-onboarding-id="${firstExpectedStepOnRoute.anchorId}"]`;
            if (!document.querySelector(firstExpectedSelector)) {
                retryTimeout = scheduleMissingAnchorRetry(missingAnchorsRetryRef, () => {
                    setAnchorRetryTick((value) => value + 1);
                });

                if (retryTimeout) {
                    return () => clearRetryTimeout(retryTimeout);
                }

                return;
            }
        }

        async function persistStepAndNavigate(
            stepIndex: number,
            route: string,
            driverToDestroy?: Driver
        ) {
            await submitAction('set-step', stepIndex);

            if (route !== pathname) {
                destroyReasonRef.current = 'navigate';
                driverToDestroy?.destroy();
                router.push(route);
                return;
            }

            if (driverToDestroy) {
                destroyReasonRef.current = 'navigate';
                driverToDestroy.destroy();
            }
        }

        const guideSteps = toRouteGuideSteps(tutorialForRun, pathname, canAccessJornadaForRun, currentStep);
        if (guideSteps.length === 0) {
            if (firstExpectedStepOnRoute) {
                retryTimeout = scheduleMissingAnchorRetry(missingAnchorsRetryRef, () => {
                    setAnchorRetryTick((value) => value + 1);
                });

                return () => clearRetryTimeout(retryTimeout);
            }

            retryTimeout = scheduleMissingAnchorRetry(missingAnchorsRetryRef, () => {
                    setAnchorRetryTick((value) => value + 1);
            });

            if (retryTimeout) {
                return () => clearRetryTimeout(retryTimeout);
            }

            const nextStep = findNextAnchoredStep(tutorialForRun, currentStep - 1, canAccessJornadaForRun);
            if (nextStep) {
                if (nextStep.route !== pathname) {
                    void persistStepAndNavigate(nextStep.stepIndex, nextStep.route);
                    return;
                }

                void submitAction('set-step', nextStep.stepIndex);
                return;
            }

            void submitAction('complete');
            return;
        }

        const startIndex = Math.max(0, guideSteps.findIndex((step) => step.stepIndex >= currentStep));
        missingAnchorsRetryRef.current = 0;

        let isCancelled = false;

        async function highlight() {
            const { driver } = await import('driver.js');

            if (isCancelled) {
                return;
            }

            const lastGuideStepIndex = guideSteps.at(-1)?.stepIndex ?? -1;
            const hasNextGlobalStep =
                lastGuideStepIndex >= 0
                    ? Boolean(findNextAnchoredStep(tutorialForRun, lastGuideStepIndex, canAccessJornadaForRun))
                    : false;

            const instance = driver({
                steps: guideSteps,
                showProgress: true,
                nextBtnText: 'Próximo',
                prevBtnText: 'Anterior',
                doneBtnText: hasNextGlobalStep ? 'Continuar' : 'Concluir',
                overlayClickBehavior: 'close',
                stagePadding: 6,
                overlayColor: 'rgba(2, 6, 23, 0.72)',
                popoverClass: 'scudo-onboarding-popover',
                onNextClick: (_, __, options) => {
                    const activeIndex = options.state.activeIndex ?? 0;
                    const isLastLocalStep = activeIndex >= guideSteps.length - 1;

                    if (!isLastLocalStep) {
                        options.driver.moveNext();
                        return;
                    }

                    const lastLocalStep = guideSteps.at(-1);
                    if (!lastLocalStep) {
                        destroyReasonRef.current = 'complete';
                        options.driver.destroy();
                        return;
                    }

                    const nextStep = findNextAnchoredStep(
                        tutorialForRun,
                        lastLocalStep.stepIndex,
                        canAccessJornadaForRun
                    );

                    if (!nextStep) {
                        destroyReasonRef.current = 'complete';
                        options.driver.destroy();
                        return;
                    }

                    if (nextStep.route !== pathname) {
                        void persistStepAndNavigate(nextStep.stepIndex, nextStep.route, options.driver);
                        return;
                    }

                    void persistStepAndNavigate(nextStep.stepIndex, nextStep.route, options.driver);
                },
                onPrevClick: (_, __, options) => {
                    const activeIndex = options.state.activeIndex ?? 0;

                    if (activeIndex > 0) {
                        options.driver.movePrevious();
                        return;
                    }

                    const firstLocalStep = guideSteps[0];
                    const previousStep = findPreviousAnchoredStep(
                        tutorialForRun,
                        firstLocalStep.stepIndex,
                        canAccessJornadaForRun
                    );
                    if (!previousStep) {
                        return;
                    }

                    if (previousStep.route !== pathname) {
                        void persistStepAndNavigate(previousStep.stepIndex, previousStep.route, options.driver);
                        return;
                    }

                    void persistStepAndNavigate(previousStep.stepIndex, previousStep.route, options.driver);
                },
                onCloseClick: (_, __, options) => {
                    destroyReasonRef.current = 'skip';
                    options.driver.destroy();
                },
                onHighlighted: (_, __, options) => {
                    const activeIndex = options.state.activeIndex ?? 0;
                    const currentGuideStep = guideSteps[activeIndex];

                    if (!currentGuideStep) {
                        return;
                    }

                    if (lastSyncedStepRef.current === currentGuideStep.stepIndex) {
                        return;
                    }

                    lastSyncedStepRef.current = currentGuideStep.stepIndex;
                    void submitAction('set-step', currentGuideStep.stepIndex);
                },
                onDestroyed: () => {
                    driverRef.current = null;

                    if (destroyReasonRef.current === 'navigate') {
                        destroyReasonRef.current = null;
                        return;
                    }

                    if (destroyReasonRef.current === 'complete') {
                        destroyReasonRef.current = null;
                        void submitAction('complete');
                        return;
                    }

                    const lastHighlightedStepIndex = lastSyncedStepRef.current;
                    if (lastHighlightedStepIndex !== null) {
                        const nextStep = findNextAnchoredStep(
                            tutorialForRun,
                            lastHighlightedStepIndex,
                            canAccessJornadaForRun
                        );

                        if (nextStep) {
                            if (nextStep.route !== pathname) {
                                void persistStepAndNavigate(nextStep.stepIndex, nextStep.route);
                                return;
                            }

                            void submitAction('set-step', nextStep.stepIndex);
                            return;
                        }

                        void submitAction('complete');
                        return;
                    }

                    destroyReasonRef.current = null;
                    void submitAction('skip');
                },
            });

            driverRef.current = instance;
            instance.drive(Math.max(0, startIndex));
        }

        void highlight();

        return () => {
            isCancelled = true;
            clearRetryTimeout(retryTimeout);
        };
    }, [anchorRetryTick, currentStep, guidedEnabled, mode, pathname, payload?.progress, router, shouldShow, tutorial]);

    if (isLoading || !shouldShow || !tutorial || !payload?.progress) {
        return null;
    }

    const activeStep = tutorial.steps[currentStep];
    const isGuidedInProgress = guidedEnabled && payload.progress.status === 'IN_PROGRESS';

    if (guidedEnabled && (mode === 'tutorial' || isGuidedInProgress)) {
        return null;
    }

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
                                {guidedEnabled && (
                                    <p className="text-sm text-slate-300">
                                        O modo guiado destaca as áreas da interface durante cada passo para facilitar a navegação.
                                    </p>
                                )}
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
                                {guidedEnabled ? 'Começar tour guiado' : 'Começar tutorial'}
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
