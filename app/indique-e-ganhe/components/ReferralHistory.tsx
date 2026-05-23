import type { MgmReferralView } from '@/app/lib/mgm/service';

interface ReferralHistoryProps {
    readonly referrals: readonly MgmReferralView[];
}

const STATUS_META: Record<
    MgmReferralView['status'],
    { label: string; className: string }
> = {
    pending: {
        label: 'Em garantia',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    },
    valid: {
        label: 'Validada',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    invalid: {
        label: 'Não elegível',
        className: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    },
    reverted: {
        label: 'Reembolsada',
        className: 'bg-red-500/15 text-red-300 border-red-500/30',
    },
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default function ReferralHistory({ referrals }: ReferralHistoryProps) {
    if (referrals.length === 0) {
        return (
            <div className="flex flex-col items-center text-center py-12 px-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.03] border border-border-light dark:border-border-dark">
                    <span
                        className="material-symbols-outlined text-[28px] text-slate-500"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                        group_add
                    </span>
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-200">
                    Nenhuma indicação ainda
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-[42ch] leading-relaxed">
                    Compartilhe seu link — as indicações aparecem aqui assim que a
                    pessoa compra pelo DevQuest.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto scrollbar-modern">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-slate-500 border-b border-border-light dark:border-border-dark">
                        <th className="py-2.5 pr-4 font-semibold">Indicado</th>
                        <th className="py-2.5 pr-4 font-semibold">Data</th>
                        <th className="py-2.5 pr-4 font-semibold">Pontos</th>
                        <th className="py-2.5 pr-4 font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60">
                    {referrals.map((referral) => {
                        const meta = STATUS_META[referral.status];
                        return (
                            <tr
                                key={referral.id}
                                className="transition-colors hover:bg-white/[0.02]"
                            >
                                <td className="py-3.5 pr-4">
                                    <p className="text-white font-medium truncate max-w-[14rem]">
                                        {referral.referredName ?? referral.referredEmailMasked}
                                    </p>
                                    {referral.referredName ? (
                                        <p className="text-xs text-slate-500 truncate max-w-[14rem]">
                                            {referral.referredEmailMasked}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="py-3.5 pr-4 text-slate-400 whitespace-nowrap tabular-nums">
                                    {formatDate(referral.signedUpAt)}
                                </td>
                                <td className="py-3.5 pr-4 text-slate-100 font-semibold tabular-nums">
                                    {referral.pointsEarned}
                                </td>
                                <td className="py-3.5 pr-4">
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
                                        title={
                                            referral.status === 'invalid' && referral.invalidReason
                                                ? `Motivo: ${referral.invalidReason}`
                                                : undefined
                                        }
                                    >
                                        {meta.label}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
