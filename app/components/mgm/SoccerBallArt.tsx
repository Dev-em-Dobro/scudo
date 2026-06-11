/**
 * Arte decorativa da temporada (v0.5) — bola de futebol estilizada em SVG,
 * usada com opacidade baixa no banner e no strip do painel. Sem dependência
 * de asset binário: quando o time de design entregar a arte oficial da
 * temporada, é só trocar este componente por um <Image>.
 */
interface SoccerBallArtProps {
    readonly className?: string;
}

export default function SoccerBallArt({ className }: SoccerBallArtProps) {
    return (
        <svg
            viewBox="0 0 200 200"
            fill="none"
            aria-hidden="true"
            className={className}
        >
            <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="5" />
            {/* gomo central (pentágono) */}
            <path
                d="M100 58 L140 87 L125 134 L75 134 L60 87 Z"
                fill="currentColor"
            />
            {/* costuras radiais */}
            <path d="M100 58 L100 6" stroke="currentColor" strokeWidth="5" />
            <path d="M140 87 L189 71" stroke="currentColor" strokeWidth="5" />
            <path d="M125 134 L156 175" stroke="currentColor" strokeWidth="5" />
            <path d="M75 134 L44 175" stroke="currentColor" strokeWidth="5" />
            <path d="M60 87 L11 71" stroke="currentColor" strokeWidth="5" />
            {/* gomos da borda */}
            <path d="M62 14 L100 6 L138 14" stroke="currentColor" strokeWidth="5" />
            <path d="M189 71 L194 110" stroke="currentColor" strokeWidth="5" />
            <path d="M156 175 L120 193" stroke="currentColor" strokeWidth="5" />
            <path d="M44 175 L80 193" stroke="currentColor" strokeWidth="5" />
            <path d="M11 71 L6 110" stroke="currentColor" strokeWidth="5" />
        </svg>
    );
}
