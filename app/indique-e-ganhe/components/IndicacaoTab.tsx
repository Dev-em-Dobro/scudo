'use client';

import { useState } from 'react';

import type { MgmReferralView } from '@/app/lib/mgm/service';
import ReferralHistory from '@/app/indique-e-ganhe/components/ReferralHistory';
import {
    MGM_PURPLE,
    MGM_PURPLE_SOFT,
    PANEL_SHADOW,
} from '@/app/indique-e-ganhe/components/theme';

interface IndicacaoTabProps {
    readonly code: string;
    readonly shareLink: string;
    readonly referrals: readonly MgmReferralView[];
    readonly boostActive: boolean;
    readonly boostMultiplier: number;
    readonly seasonName: string | null;
}

const WHATSAPP_MESSAGE =
    'Tô estudando programação no DevQuest e curti demais. Usa meu link que você ainda ganha 10% de desconto:';

export default function IndicacaoTab({
    code,
    shareLink,
    referrals,
    boostActive,
    boostMultiplier,
    seasonName,
}: IndicacaoTabProps) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            globalThis.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard indisponível (http/permissão) — seleção manual cobre.
            setCopied(false);
        }
    }

    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
        `${WHATSAPP_MESSAGE} ${shareLink}`,
    )}`;

    return (
        <div className="space-y-6">
            <div
                className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-6 md:p-7"
                style={{ boxShadow: PANEL_SHADOW }}
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Seu link de indicação
                    </span>
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold font-mono"
                        style={{ color: MGM_PURPLE, backgroundColor: MGM_PURPLE_SOFT }}
                    >
                        <span
                            className="material-symbols-outlined text-[15px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            tag
                        </span>
                        {code}
                    </span>
                </div>

                <p className="mt-2 text-sm text-slate-400 max-w-[60ch] leading-relaxed">
                    Compartilhe este link. Quando alguém compra o DevQuest por ele, você
                    pontua e a pessoa ganha 10% de desconto. O código é permanente e único.
                </p>

                <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                    <input
                        readOnly
                        value={shareLink}
                        onFocus={(event) => event.currentTarget.select()}
                        className="flex-1 min-w-0 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark px-4 py-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-slate-500 transition-colors"
                        aria-label="Link de indicação"
                    />
                    <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-all duration-200 cursor-pointer active:scale-[0.97]"
                    >
                        <span
                            className="material-symbols-outlined text-[18px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            {copied ? 'check_circle' : 'content_copy'}
                        </span>
                        {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 px-5 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 active:scale-[0.97]"
                    >
                        <span
                            className="material-symbols-outlined text-[18px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            share
                        </span>
                        WhatsApp
                    </a>
                </div>

                {boostActive ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        <span
                            className="material-symbols-outlined text-[18px] text-amber-400"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            local_fire_department
                        </span>
                        <span className="text-xs font-semibold text-amber-300">
                            {seasonName ? `${seasonName}: ` : ''}pontos turbinados em {boostMultiplier}x — é a melhor hora pra indicar.
                        </span>
                    </div>
                ) : null}
            </div>

            <div
                className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-6 md:p-7"
                style={{ boxShadow: PANEL_SHADOW }}
            >
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-white">Suas indicações</h3>
                    {referrals.length > 0 ? (
                        <span className="text-xs text-slate-500 tabular-nums">
                            {referrals.length} registro{referrals.length === 1 ? '' : 's'}
                        </span>
                    ) : null}
                </div>
                <ReferralHistory referrals={referrals} />
            </div>
        </div>
    );
}
