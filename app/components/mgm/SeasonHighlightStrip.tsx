import Link from 'next/link';

import SoccerBallArt from '@/app/components/mgm/SoccerBallArt';

/**
 * Destaque sutil da temporada no painel (v0.5) — strip fino, linka pro
 * Indique e Ganhe. Renderizado apenas com MGM ligado + temporada ativa
 * (o caller decide; este componente é só apresentação).
 */
interface SeasonHighlightStripProps {
    readonly seasonName: string | null;
    readonly multiplier: number;
    readonly endsAt: string | null;
}

export default function SeasonHighlightStrip({
    seasonName,
    multiplier,
    endsAt,
}: SeasonHighlightStripProps) {
    const endsAtLabel = endsAt
        ? new Date(endsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : null;

    return (
        <Link
            href="/indique-e-ganhe"
            className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-[#ff6b35]/40 bg-[#1a1a1a] px-5 py-3.5 transition-colors duration-200 hover:border-[#ff6b35]"
        >
            <SoccerBallArt className="pointer-events-none absolute -right-3 -top-6 h-20 w-20 shrink-0 text-[#ff6b35]/10" />

            <span className="text-[20px]" aria-hidden="true">
                ⚽
            </span>
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/80 [font-family:'Ubuntu',Helvetica]">
                <strong className="text-white">{seasonName ?? 'Temporada especial'}</strong> no ar —
                indicações valem <strong className="text-[#ff6b35]">{multiplier}x pontos</strong>
                {endsAtLabel ? ` até ${endsAtLabel}` : ''}.
            </p>
            <span className="shrink-0 text-[12px] font-bold text-[#ff6b35] transition-colors group-hover:text-white [font-family:'Ubuntu',Helvetica]">
                Indicar agora →
            </span>
        </Link>
    );
}
