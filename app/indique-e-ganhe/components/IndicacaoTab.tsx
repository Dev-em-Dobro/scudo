'use client';

import { useState } from 'react';

import type { MgmReferralView } from '@/app/lib/mgm/service';
import ReferralHistory from '@/app/indique-e-ganhe/components/ReferralHistory';

interface IndicacaoTabProps {
    readonly code: string;
    readonly shareLink: string;
    readonly referrals: readonly MgmReferralView[];
    readonly boostActive: boolean;
}

const WHATSAPP_MESSAGE =
    'Tô estudando programação no DevQuest e curti demais. Usa meu link que você ainda ganha 10% de desconto:';

export default function IndicacaoTab({
    code,
    shareLink,
    referrals,
    boostActive,
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
            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6 space-y-4">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Seu link de indicação</p>
                    <p className="text-xs text-slate-400">
                        Código <span className="font-mono text-violet-300">{code}</span> —
                        permanente e único. Quem comprar por ele ganha 10% off e você pontua.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        readOnly
                        value={shareLink}
                        onFocus={(event) => event.currentTarget.select()}
                        className="flex-1 min-w-0 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark px-3 py-2.5 text-sm text-slate-200 font-mono"
                        aria-label="Link de indicação"
                    />
                    <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                        <span
                            className="material-symbols-outlined text-[18px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            {copied ? 'check' : 'content_copy'}
                        </span>
                        {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 transition-colors"
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
                    <p className="text-xs font-semibold text-orange-300">
                        🔥 Pontos turbinados nesta janela — é a melhor hora pra indicar.
                    </p>
                ) : null}
            </div>

            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6">
                <h3 className="text-sm font-bold text-white mb-3">Suas indicações</h3>
                <ReferralHistory referrals={referrals} />
            </div>
        </div>
    );
}
