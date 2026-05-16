import type { MgmStatusCards } from '@/app/lib/mgm/service';

interface StatusCardsProps {
    readonly data: MgmStatusCards;
}

interface CardProps {
    readonly icon: string;
    readonly iconColor: string;
    readonly label: string;
    readonly value: number;
    readonly hint: string;
}

function Card({ icon, iconColor, label, value, hint }: CardProps) {
    return (
        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 flex items-start gap-4">
            <span
                className={`material-symbols-outlined text-2xl shrink-0 ${iconColor}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
            >
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                <p className="text-sm font-semibold text-slate-200">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
            </div>
        </div>
    );
}

export default function StatusCards({ data }: StatusCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card
                icon="hourglass_top"
                iconColor="text-amber-400"
                label="Pendentes"
                value={data.pendingCount}
                hint={`${data.pointsPending} pts em garantia (7 dias)`}
            />
            <Card
                icon="verified"
                iconColor="text-emerald-400"
                label="Disponíveis"
                value={data.validCount}
                hint={`${data.pointsAvailable} pts validados`}
            />
            <Card
                icon="redeem"
                iconColor="text-violet-400"
                label="Resgatados"
                value={data.redeemedCount}
                hint="Resgate disponível ao fim do LI-26"
            />
        </div>
    );
}
