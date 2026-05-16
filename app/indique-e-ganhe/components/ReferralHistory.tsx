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
            <div className="text-center py-10 px-4">
                <span
                    className="material-symbols-outlined text-4xl text-slate-500"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                >
                    group_add
                </span>
                <p className="text-sm text-slate-300 mt-2">
                    Você ainda não tem indicações registradas.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    Compartilhe seu link — as indicações aparecem aqui assim que o amigo compra.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto scrollbar-modern">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-border-light dark:border-border-dark">
                        <th className="py-2.5 pr-4 font-semibold">Indicado</th>
                        <th className="py-2.5 pr-4 font-semibold">Data</th>
                        <th className="py-2.5 pr-4 font-semibold">Pontos</th>
                        <th className="py-2.5 pr-4 font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {referrals.map((referral) => {
                        const meta = STATUS_META[referral.status];
                        return (
                            <tr
                                key={referral.id}
                                className="border-b border-border-light/50 dark:border-border-dark/50"
                            >
                                <td className="py-3 pr-4">
                                    <p className="text-white font-medium truncate max-w-[14rem]">
                                        {referral.referredName ?? referral.referredEmailMasked}
                                    </p>
                                    {referral.referredName ? (
                                        <p className="text-xs text-slate-500 truncate max-w-[14rem]">
                                            {referral.referredEmailMasked}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="py-3 pr-4 text-slate-300 whitespace-nowrap">
                                    {formatDate(referral.signedUpAt)}
                                </td>
                                <td className="py-3 pr-4 text-slate-200 font-semibold tabular-nums">
                                    {referral.pointsEarned}
                                </td>
                                <td className="py-3 pr-4">
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
