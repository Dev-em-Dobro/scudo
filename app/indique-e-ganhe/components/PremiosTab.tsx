import {
    MGM_PURPLE,
    MGM_PURPLE_SOFT,
    PANEL_SHADOW,
} from '@/app/indique-e-ganhe/components/theme';

export default function PremiosTab() {
    return (
        <div
            className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-10 md:p-12 flex flex-col items-center text-center"
            style={{ boxShadow: PANEL_SHADOW }}
        >
            <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: MGM_PURPLE_SOFT }}
            >
                <span
                    className="material-symbols-outlined text-[34px]"
                    style={{ fontVariationSettings: "'FILL' 1", color: MGM_PURPLE }}
                >
                    card_giftcard
                </span>
            </span>
            <span
                className="mt-5 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: MGM_PURPLE, backgroundColor: MGM_PURPLE_SOFT }}
            >
                Em breve
            </span>
            <h3 className="mt-3 text-lg font-bold text-white tracking-tight">Prêmios</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-[46ch] leading-relaxed">
                A vitrine de prêmios e o resgate abrem ao fim desta ação. Continue
                acumulando pontos — eles contam quando o catálogo abrir.
            </p>
        </div>
    );
}
