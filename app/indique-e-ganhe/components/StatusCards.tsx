import type { MgmStatusCards } from '@/app/lib/mgm/service';
import { getGuaranteeDays } from '@/app/lib/mgm/seasons';
import { MGM_PURPLE } from '@/app/indique-e-ganhe/components/theme';

interface StatusCardsProps {
    readonly data: MgmStatusCards;
}

interface SegmentProps {
    readonly label: string;
    readonly value: number;
    readonly valueColor?: string;
    readonly hint: string;
    readonly accentColor?: string;
}

function Card({ label, value, valueColor, hint, accentColor }: SegmentProps) {
    return (
        <div
            className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 transition-colors duration-200 hover:border-[#6528d3]"
            style={accentColor ? { borderTopColor: accentColor, borderTopWidth: '2px' } : undefined}
        >
            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                {label}_
            </span>
            <p
                className="mt-4 text-[40px] font-black tabular-nums leading-none [font-family:'Ubuntu',Helvetica]"
                style={{ color: valueColor ?? '#ffffff' }}
            >
                {value}
            </p>
            <p className="mt-3 text-white/60 text-[14px] leading-relaxed [font-family:'Ubuntu',Helvetica]">
                {hint}
            </p>
        </div>
    );
}

export default function StatusCards({ data }: StatusCardsProps) {
    const guaranteeDays = getGuaranteeDays();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
                label="Pendentes"
                value={data.pendingCount}
                hint={`${data.pointsPending} pts em garantia · ${guaranteeDays} dias`}
                accentColor="#ff6b35"
            />
            <Card
                label="Disponíveis"
                value={data.validCount}
                valueColor={MGM_PURPLE}
                hint={`${data.pointsAvailable} pts prontos pra resgatar`}
                accentColor="#6528d3"
            />
            <Card
                label="Resgatados"
                value={data.redeemedCount}
                hint={
                    data.pointsSpent > 0
                        ? `${data.pointsSpent} pts gastos em prêmios`
                        : 'Troque seus pontos na aba Prêmios'
                }
                accentColor="#22c55e"
            />
        </div>
    );
}
