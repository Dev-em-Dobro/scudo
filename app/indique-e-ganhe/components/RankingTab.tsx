import { PANEL_SHADOW } from '@/app/indique-e-ganhe/components/theme';

export default function RankingTab() {
    return (
        <div
            className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-10 md:p-12 flex flex-col items-center text-center"
            style={{ boxShadow: PANEL_SHADOW }}
        >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <span
                    className="material-symbols-outlined text-[34px] text-amber-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    leaderboard
                </span>
            </span>
            <span className="mt-5 inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-300">
                Em breve
            </span>
            <h3 className="mt-3 text-lg font-bold text-white tracking-tight">Ranking</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-[48ch] leading-relaxed">
                O ranking ao vivo chega ao fim desta ação. A apuração do Top 1
                (kit DevQuest) é feita ao final, com desempate por quem
                chegou primeiro.
            </p>
        </div>
    );
}
