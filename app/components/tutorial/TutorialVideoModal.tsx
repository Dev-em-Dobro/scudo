'use client';

import { useAuth } from '@/app/providers/AuthProvider';
import { useTutorial } from '@/app/providers/TutorialProvider';

const TUTORIAL_VIDEO_URL =
    process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL ?? 'https://www.youtube.com/embed/A0-uIK5-AUg?rel=0';

export default function TutorialVideoModal() {
    const { isAuthenticated } = useAuth();
    const { isOpen, closeTutorial, dismiss } = useTutorial();

    if (!isAuthenticated || !isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-2xl bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-violet-400 text-2xl shrink-0 mt-0.5">
                                smart_display
                            </span>
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-white">
                                    Antes de começar, assista ao tutorial
                                </h2>
                                <p className="text-sm text-slate-300">
                                    Este vídeo mostra como usar a plataforma e aproveitar ao máximo sua jornada de carreira. Recomendamos assistir antes de explorar os recursos.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={closeTutorial}
                            aria-label="Fechar"
                            className="shrink-0 text-slate-400 hover:text-white transition-colors cursor-pointer mt-0.5"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                {/* Video */}
                <div className="relative w-full aspect-video bg-black">
                    <iframe
                        src={TUTORIAL_VIDEO_URL}
                        title="Tutorial da plataforma Scudo"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5">
                    <button
                        type="button"
                        onClick={dismiss}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                        Não mostrar novamente
                    </button>
                </div>
            </div>
        </div>
    );
}
