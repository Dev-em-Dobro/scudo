'use client';

import { useAuth } from '@/app/providers/AuthProvider';
import { useTutorial } from '@/app/providers/TutorialProvider';

export default function DailyStreakAnnouncementModal() {
    const { isAuthenticated } = useAuth();
    const { isStreakAnnouncementOpen, dismissStreakAnnouncement } = useTutorial();

    if (!isAuthenticated || !isStreakAnnouncementOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-2xl bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-2xl">
                <div className="p-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="material-symbols-outlined text-orange-300 text-[26px] shrink-0 rounded-lg border border-orange-400/35 bg-orange-500/15 p-1"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    local_fire_department
                                </span>
                                <h2 className="text-lg font-extrabold leading-tight tracking-tight text-white sm:text-xl">
                                    Nova feature: streak diário para manter sua constância
                                </h2>
                            </div>
                            <p className="text-sm text-slate-300">
                                Ao concluir pelo menos uma tarefa da Jornada por dia, você mantém sua sequência.
                                Esse hábito é importante para sustentar o ritmo de estudos e evoluir de forma
                                contínua.
                            </p>
                        </div>
                        <button
                            onClick={dismissStreakAnnouncement}
                            aria-label="Fechar aviso de streak diário"
                            className="shrink-0 text-slate-400 hover:text-white transition-colors cursor-pointer mt-0.5"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                <div className="px-5 pb-5">
                    <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 p-4">
                        <p className="text-sm text-orange-100">
                            A constância é um dos fatores que mais impactam seu progresso. Ao manter seu streak, você
                            desbloqueia badges como recompensas de evolução:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-orange-100">
                            <li><span className="font-semibold">7 dias:</span> Ritmo Inicial</li>
                            <li><span className="font-semibold">30 dias:</span> Constância de Ferro</li>
                            <li><span className="font-semibold">60 dias:</span> Foco Inabalável</li>
                            <li><span className="font-semibold">100 dias:</span> Lenda da Scudo</li>
                        </ul>
                        <p className="mt-2 text-sm text-orange-100">
                            Acompanhe no topo da plataforma e também na página da Jornada do aluno para não quebrar a
                            sequência.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 pt-0">
                    <button
                        type="button"
                        onClick={dismissStreakAnnouncement}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
}
