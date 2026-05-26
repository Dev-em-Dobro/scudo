'use client';

import { useState } from 'react';

import type { MgmReferralView } from '@/app/lib/mgm/service';
import ReferralHistory from '@/app/indique-e-ganhe/components/ReferralHistory';

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
            setCopied(false);
        }
    }

    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
        `${WHATSAPP_MESSAGE} ${shareLink}`,
    )}`;

    return (
        <div className="space-y-8">
            {/* Link card */}
            <section className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8 transition-colors duration-200 hover:border-[#6528d3]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                        Seu link_
                    </span>
                    <span className="inline-flex items-center rounded-md border border-[#444] px-3 py-1 text-[12px] font-mono text-white [font-family:'Ubuntu',Helvetica]">
                        {code}
                    </span>
                </div>

                <p className="mt-3 text-white/70 text-[14px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                    Compartilhe este link. Quando alguém compra o DevQuest por ele, você
                    pontua e a pessoa ganha 10% de desconto. O código é permanente e único.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <input
                        readOnly
                        value={shareLink}
                        onFocus={(event) => event.currentTarget.select()}
                        className="flex-1 min-w-0 rounded-lg bg-black border border-[#333] px-4 py-3 text-[14px] text-white font-mono focus:outline-none focus:border-[#6528d3] transition-colors [font-family:'Ubuntu',Helvetica]"
                        aria-label="Link de indicação"
                    />
                    <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="shrink-0 inline-flex items-center justify-center rounded-lg bg-[#6528d3] hover:bg-[#5020b0] px-6 py-3 text-[14px] font-bold text-white transition-colors duration-200 cursor-pointer [font-family:'Ubuntu',Helvetica]"
                    >
                        {copied ? 'Copiado' : 'Copiar link'}
                    </button>
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center justify-center rounded-lg bg-[#22c55e] hover:bg-[#16a34a] px-6 py-3 text-[14px] font-bold text-white transition-colors duration-200 [font-family:'Ubuntu',Helvetica]"
                    >
                        WhatsApp
                    </a>
                </div>

                {boostActive ? (
                    <p className="mt-5 text-[14px] text-[#ff6b35] font-bold [font-family:'Ubuntu',Helvetica]">
                        {seasonName ? `${seasonName}: ` : ''}pontos turbinados em {boostMultiplier}x agora — é a melhor hora pra indicar.
                    </p>
                ) : null}
            </section>

            {/* History card */}
            <section className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                        Suas indicações_
                    </span>
                    {referrals.length > 0 ? (
                        <span className="text-[12px] text-white/60 tabular-nums [font-family:'Ubuntu',Helvetica]">
                            {referrals.length} registro{referrals.length === 1 ? '' : 's'}
                        </span>
                    ) : null}
                </div>
                <ReferralHistory referrals={referrals} />
            </section>
        </div>
    );
}
