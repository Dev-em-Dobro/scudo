import type { MgmReferralView } from '@/app/lib/mgm/service';

interface ReferralHistoryProps {
    readonly referrals: readonly MgmReferralView[];
}

const STATUS_META: Record<
    MgmReferralView['status'],
    { label: string; bg: string; text: string }
> = {
    pending: { label: 'Em garantia', bg: 'bg-[#ff6b35]', text: 'text-white' },
    valid: { label: 'Validada', bg: 'bg-[#22c55e]', text: 'text-white' },
    invalid: { label: 'Não elegível', bg: 'bg-[#444]', text: 'text-white/80' },
    reverted: { label: 'Reembolsada', bg: 'bg-[#ef4444]', text: 'text-white' },
};

function translateInvalidReason(reason: string | null): string | null {
    if (!reason) return null;
    switch (reason) {
        case 'self_referral':
            return 'Você indicou seu próprio e-mail ou telefone';
        case 'duplicate':
            return 'Esse amigo já foi indicado por outra pessoa';
        case 'existing_student':
            return 'Esse amigo já é aluno DevQuest';
        case 'disposable_domain':
            return 'O e-mail usado é de domínio temporário (não aceito)';
        case 'manual_disqualify':
            return 'Desqualificada pela equipe DevQuest';
        default:
            return `Motivo: ${reason}`;
    }
}

function reasonForStatus(referral: MgmReferralView): string | null {
    if (referral.status === 'invalid') {
        return translateInvalidReason(referral.invalidReason);
    }
    if (referral.status === 'reverted') {
        return 'O amigo solicitou reembolso — os pontos foram retirados do saldo';
    }
    if (referral.status === 'pending') {
        return `Conta pra ranking, mas só vira saldo após o fim da garantia (${new Date(referral.guaranteeUntil).toLocaleDateString('pt-BR')})`;
    }
    return null;
}

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
            <div className="flex flex-col items-center text-center py-12">
                <p className="text-[16px] font-bold text-white [font-family:'Ubuntu',Helvetica]">
                    Nenhuma indicação ainda
                </p>
                <p className="mt-2 text-[14px] text-white/60 max-w-[44ch] leading-relaxed [font-family:'Ubuntu',Helvetica]">
                    Compartilhe seu link — as indicações aparecem aqui assim que a pessoa
                    compra pelo DevQuest.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto scrollbar-modern">
            <table className="w-full">
                <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] border-b border-[#333] [font-family:'Ubuntu',Helvetica]">
                        <th className="py-3 pr-4">Indicado</th>
                        <th className="py-3 pr-4">Data</th>
                        <th className="py-3 pr-4">Pontos</th>
                        <th className="py-3 pr-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                    {referrals.map((referral) => {
                        const meta = STATUS_META[referral.status];
                        const reason = reasonForStatus(referral);
                        return (
                            <tr key={referral.id} className="transition-colors hover:bg-white/[0.02]">
                                <td className="py-4 pr-4">
                                    <p className="text-[14px] font-bold text-white truncate max-w-[14rem] [font-family:'Ubuntu',Helvetica]">
                                        {referral.referredName ?? referral.referredEmailMasked}
                                    </p>
                                    {referral.referredName ? (
                                        <p className="text-[12px] text-white/50 truncate max-w-[14rem] [font-family:'Ubuntu',Helvetica]">
                                            {referral.referredEmailMasked}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="py-4 pr-4 text-[14px] text-white/70 whitespace-nowrap tabular-nums [font-family:'Ubuntu',Helvetica]">
                                    {formatDate(referral.signedUpAt)}
                                </td>
                                <td className="py-4 pr-4 text-[14px] text-white font-bold tabular-nums [font-family:'Ubuntu',Helvetica]">
                                    {referral.pointsEarned}
                                </td>
                                <td className="py-4 pr-4">
                                    <div className="flex flex-col items-start gap-1.5">
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] ${meta.bg} ${meta.text} [font-family:'Ubuntu',Helvetica]`}
                                        >
                                            {meta.label}
                                        </span>
                                        {reason && (
                                            <span className="text-[11px] text-white/50 leading-tight max-w-[30ch] [font-family:'Ubuntu',Helvetica]">
                                                {reason}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
