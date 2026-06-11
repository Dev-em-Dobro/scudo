import SoccerBallArt from '@/app/components/mgm/SoccerBallArt';

/**
 * Banner da temporada ativa no topo do Indique e Ganhe (v0.5).
 * Substitui o pill de boost quando há temporada rolando. A arte é SVG
 * decorativo (`SoccerBallArt`) — trocável por imagem oficial depois.
 */
interface SeasonBannerProps {
    readonly seasonName: string | null;
    readonly multiplier: number;
    readonly endsAt: string | null;
    /** Prêmio exclusivo da temporada (primeiro reward `seasonOnly` da vitrine). */
    readonly seasonPrize: { name: string; costPoints: number } | null;
}

export default function SeasonBanner({
    seasonName,
    multiplier,
    endsAt,
    seasonPrize,
}: SeasonBannerProps) {
    const endsAtLabel = endsAt
        ? new Date(endsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : null;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#ff6b35]/50 bg-gradient-to-r from-[#2a1205] via-[#1a1a1a] to-[#1a0f33] p-6 md:p-8">
            {/* arte decorativa */}
            <SoccerBallArt className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 text-[#ff6b35]/15 md:h-56 md:w-56" />

            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ff6b35] [font-family:'Ubuntu',Helvetica]">
                Temporada no ar_
            </span>

            <h2 className="mt-3 text-[24px] md:text-[28px] font-black text-white leading-tight [font-family:'Ubuntu',Helvetica]">
                {seasonName ?? 'Temporada especial'}
            </h2>

            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-white/80 [font-family:'Ubuntu',Helvetica]">
                Toda indicação válida vale <strong className="text-[#ff6b35]">{multiplier}x pontos</strong>
                {endsAtLabel ? (
                    <>
                        {' '}até <strong className="text-white">{endsAtLabel}</strong>
                    </>
                ) : null}
                . Aproveite a janela pra acumular mais rápido.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ff6b35] px-4 py-2 text-[12px] font-bold tracking-wide text-white [font-family:'Ubuntu',Helvetica]">
                    {multiplier}X PONTOS
                </span>
                {seasonPrize && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#ff6b35]/50 bg-[#ff6b35]/10 px-4 py-2 text-[12px] font-bold tracking-wide text-[#ff6b35] [font-family:'Ubuntu',Helvetica]">
                        ⭐ Prêmio especial: {seasonPrize.name} · {seasonPrize.costPoints} pts
                    </span>
                )}
            </div>
        </div>
    );
}
