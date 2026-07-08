'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '@/app/providers/AuthProvider';

const DISMISSED_KEY = 'scudo_generated_resume_intro_dismissed';

type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

type OnboardingCheckResponse = {
    enabled?: boolean;
    progress?: {
        status: OnboardingStatus;
    };
};

function shouldShowForOnboardingStatus(status: OnboardingStatus | undefined) {
    return status === 'NOT_STARTED' || status === 'IN_PROGRESS';
}

export default function GeneratedResumeIntroBanner() {
    const { isAuthenticated } = useAuth();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        if (localStorage.getItem(DISMISSED_KEY) === 'true') {
            return;
        }

        let isActive = true;

        async function resolveVisibility() {
            try {
                const response = await fetch('/api/onboarding', {
                    method: 'GET',
                    cache: 'no-store',
                    credentials: 'include',
                });

                if (!response.ok) {
                    if (isActive) {
                        setVisible(true);
                    }
                    return;
                }

                const data = (await response.json()) as OnboardingCheckResponse;
                const onboardingActive = Boolean(data.enabled);
                const isFirstAccess = !onboardingActive
                    || shouldShowForOnboardingStatus(data.progress?.status);

                if (isActive && isFirstAccess) {
                    setVisible(true);
                }
            } catch {
                if (isActive) {
                    setVisible(true);
                }
            }
        }

        void resolveVisibility();

        return () => {
            isActive = false;
        };
    }, [isAuthenticated]);

    function dismiss() {
        localStorage.setItem(DISMISSED_KEY, 'true');
        setVisible(false);
    }

    if (!visible) {
        return null;
    }

    return (
        <output
            className="block rounded-xl border border-[#6528d3]/35 bg-[#6528d3]/10 px-5 py-4"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <span
                    className="material-symbols-outlined shrink-0 text-[#a78bfa]"
                    style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                >
                    auto_awesome
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Seu currículo evolui com você</p>
                    <p className="mt-1 text-sm text-white/75 leading-relaxed">
                        A Scudo monta automaticamente um currículo ATS conforme você conclui ranks na jornada,
                        adiciona projetos do curso e preenche seu{' '}
                        <Link href="/perfil" className="font-semibold text-[#a78bfa] hover:text-white transition-colors">
                            Meu Perfil
                        </Link>
                        . Você pode pré-visualizar, editar e baixar o PDF aqui no painel quando liberar o rank Bronze.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Fechar aviso sobre currículo automático"
                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#333] text-white/70 hover:text-white hover:border-[#6528d3]/40 transition-colors"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
                        close
                    </span>
                </button>
            </div>
        </output>
    );
}
