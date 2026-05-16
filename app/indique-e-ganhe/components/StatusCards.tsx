import type { MgmStatusCards } from '@/app/lib/mgm/service';
import { getGuaranteeDays } from '@/app/lib/mgm/boost';
import { MGM_PURPLE, PANEL_SHADOW } from '@/app/indique-e-ganhe/components/theme';

interface StatusCardsProps {
    readonly data: MgmStatusCards;
}

interface SegmentProps {
    readonly icon: string;
    readonly iconClass?: string;
    readonly iconColor?: string;
    readonly label: string;
    readonly value: number;
    readonly valueColor?: string;
    readonly hint: string;
}

function Segment({
    icon,
    iconClass,
    iconColor,
    label,
    value,
    valueColor,
    hint,
}: SegmentProps) {
    return (
        <div className="flex-1 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
                <span
                    className={`material-symbols-outlined text-[20px] ${iconClass ?? ''}`}
                    style={{ fontVariationSettings: "'FILL' 1", color: iconColor }}
                >
                    {icon}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {label}
                </span>
            </div>
            <p
                className="mt-3 text-3xl font-bold tabular-nums leading-none"
                style={{ color: valueColor ?? '#ffffff' }}
            >
                {value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
    );
}

export default function StatusCards({ data }: StatusCardsProps) {
    const guaranteeDays = getGuaranteeDays();

    return (
        <div
            className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark overflow-hidden flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border-light dark:divide-border-dark"
            style={{ boxShadow: PANEL_SHADOW }}
        >
            <Segment
                icon="hourglass_top"
                iconClass="text-amber-400"
                label="Pendentes"
                value={data.pendingCount}
                hint={`${data.pointsPending} pts em garantia · ${guaranteeDays} dias`}
            />
            <Segment
                icon="verified"
                iconColor={MGM_PURPLE}
                label="Disponíveis"
                value={data.validCount}
                valueColor={MGM_PURPLE}
                hint={`${data.pointsAvailable} pts prontos pra resgatar`}
            />
            <Segment
                icon="redeem"
                iconClass="text-slate-400"
                label="Resgatados"
                value={data.redeemedCount}
                hint="Resgate abre ao fim desta ação"
            />
        </div>
    );
}
