'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { MgmRewardView } from '@/app/lib/mgm/rewards';
import type { MgmRedemptionView, ShippingInfo } from '@/app/lib/mgm/redemptions';
import RewardRedeemModal from '@/app/indique-e-ganhe/components/RewardRedeemModal';
import ShippingAddressModal from '@/app/indique-e-ganhe/components/ShippingAddressModal';
import { MGM_PURPLE } from '@/app/indique-e-ganhe/components/theme';
import { formatRenewalReward } from '@/app/indique-e-ganhe/components/rewardFormatting';

interface PremiosTabProps {
    readonly rewards: readonly MgmRewardView[];
    readonly redemptions: readonly MgmRedemptionView[];
    readonly pointsAvailable: number;
    readonly savedAddress: ShippingInfo | null;
}

const STATUS_LABELS: Record<
    MgmRedemptionView['status'],
    { label: string; bg: string; text: string }
> = {
    requested: { label: 'Solicitado', bg: 'bg-[#ff6b35]', text: 'text-white' },
    approved: { label: 'Aprovado', bg: 'bg-[#3b82f6]', text: 'text-white' },
    delivered: { label: 'Entregue', bg: 'bg-[#22c55e]', text: 'text-white' },
    rejected: { label: 'Rejeitado', bg: 'bg-[#ef4444]', text: 'text-white' },
    cancelled: { label: 'Cancelado', bg: 'bg-[#444]', text: 'text-white/80' },
};

export default function PremiosTab({
    rewards,
    redemptions,
    pointsAvailable,
    savedAddress,
}: PremiosTabProps) {
    const router = useRouter();
    const [selected, setSelected] = useState<MgmRewardView | null>(null);
    const [editingAddress, setEditingAddress] = useState(false);
    const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<{ id: string; message: string } | null>(null);

    const blockedFamilies = useMemo(() => {
        const set = new Set<string>();
        for (const r of redemptions) {
            if (r.status !== 'rejected' && r.status !== 'cancelled') {
                set.add(r.rewardFamily);
            }
        }
        return set;
    }, [redemptions]);

    async function confirmCancel(id: string) {
        setCancellingId(id);
        setCancelError(null);
        try {
            const response = await fetch(`/api/mgm/redemptions/${id}/cancel`, {
                method: 'POST',
            });
            if (response.ok) {
                setConfirmingCancelId(null);
                router.refresh();
            } else {
                const data = await response.json().catch(() => ({}));
                setCancelError({ id, message: data.error ?? 'Não foi possível cancelar. Tente novamente.' });
            }
        } catch {
            setCancelError({ id, message: 'Erro de rede. Tente novamente em instantes.' });
        } finally {
            setCancellingId(null);
        }
    }

    return (
        <div className="space-y-8">
            {/* Saldo + Endereço */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Saldo */}
                <div
                    className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8 transition-colors duration-200 hover:border-[#6528d3]"
                    style={{ borderTopColor: '#6528d3', borderTopWidth: '2px' }}
                >
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                        Saldo disponível_
                    </span>
                    <p
                        className="mt-4 text-[40px] font-black tabular-nums leading-none [font-family:'Ubuntu',Helvetica]"
                        style={{ color: pointsAvailable < 0 ? '#ef4444' : MGM_PURPLE }}
                    >
                        {pointsAvailable} <span className="text-[20px] font-bold">pts</span>
                    </p>
                    <p className="mt-3 text-white/60 text-[14px] leading-relaxed [font-family:'Ubuntu',Helvetica]">
                        Pontos em garantia ainda não contam — aparecem aqui após 15 dias.
                    </p>

                    {pointsAvailable < 0 && (
                        <div className="mt-5 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 p-4">
                            <p className="text-[14px] font-bold text-[#ef4444] [font-family:'Ubuntu',Helvetica]">
                                Saldo abaixo de zero
                            </p>
                            <p className="mt-2 text-[13px] text-white/70 leading-relaxed [font-family:'Ubuntu',Helvetica]">
                                Uma indicação anterior foi <strong>reembolsada</strong> e os pontos
                                voltaram, deixando seu saldo negativo em{' '}
                                <strong>{Math.abs(pointsAvailable)} pts</strong>. Os prêmios já
                                resgatados ficam com você — nada é cobrado de volta. Pra voltar a
                                resgatar, acumule novas indicações até subir acima de zero.
                            </p>
                        </div>
                    )}
                </div>

                {/* Endereço */}
                <div className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8 transition-colors duration-200 hover:border-[#6528d3] flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                        Endereço de entrega_
                    </span>
                    <div className="mt-4 flex-1">
                        {savedAddress ? (
                            <div className="text-[14px] text-white leading-relaxed [font-family:'Ubuntu',Helvetica]">
                                <p className="font-bold">{savedAddress.name}</p>
                                <p className="text-white/70">{savedAddress.address}</p>
                                <p className="text-white/70">
                                    {savedAddress.city}/{savedAddress.state} · CEP {savedAddress.zip}
                                </p>
                            </div>
                        ) : (
                            <p className="text-[14px] text-white/60 leading-relaxed [font-family:'Ubuntu',Helvetica]">
                                Nenhum endereço cadastrado. Pediremos no próximo resgate de prêmio físico.
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setEditingAddress(true)}
                        className="mt-5 w-fit inline-flex items-center justify-center rounded-lg bg-[#6528d3] hover:bg-[#5020b0] px-5 py-2.5 text-[13px] font-bold text-white transition-colors duration-200 cursor-pointer [font-family:'Ubuntu',Helvetica]"
                    >
                        {savedAddress ? 'Editar endereço' : 'Cadastrar endereço'}
                    </button>
                </div>
            </div>

            {/* Catálogo */}
            <section>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                    Catálogo_
                </span>
                <h2 className="mt-3 mb-6 text-[24px] font-bold text-white [font-family:'Ubuntu',Helvetica]">
                    Troque seus pontos por prêmios
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map((reward) => (
                        <RewardCard
                            key={reward.id}
                            reward={reward}
                            pointsAvailable={pointsAvailable}
                            familyBlocked={blockedFamilies.has(reward.rewardFamily)}
                            onSelect={() => setSelected(reward)}
                        />
                    ))}
                </div>
            </section>

            {/* Histórico de resgates */}
            {redemptions.length > 0 && (
                <section>
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                        Seus resgates_
                    </span>
                    <div className="mt-6 rounded-2xl border border-[#333] bg-[#1a1a1a] overflow-hidden">
                        <ul className="divide-y divide-[#333]">
                            {redemptions.map((r) => {
                                const status = STATUS_LABELS[r.status];
                                const isConfirming = confirmingCancelId === r.id;
                                const isCancelling = cancellingId === r.id;
                                const errorForRow = cancelError?.id === r.id ? cancelError.message : null;
                                return (
                                    <li key={r.id} className="px-6 py-5">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[16px] font-bold text-white [font-family:'Ubuntu',Helvetica]">
                                                    {r.rewardName}
                                                </p>
                                                <p className="mt-1 text-[13px] text-white/60 tabular-nums [font-family:'Ubuntu',Helvetica]">
                                                    {r.costSnapshot} pts ·{' '}
                                                    {new Date(r.requestedAt).toLocaleDateString('pt-BR')}
                                                </p>
                                                {r.rejectedReason && (
                                                    <p className="mt-2 text-[13px] text-[#ef4444] [font-family:'Ubuntu',Helvetica]">
                                                        Motivo: {r.rejectedReason}
                                                    </p>
                                                )}
                                                {r.deliveryInfo?.couponCode && (
                                                    <p className="mt-2 text-[13px] text-[#22c55e] font-mono [font-family:'Ubuntu',Helvetica]">
                                                        Cupom: {r.deliveryInfo.couponCode}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] ${status.bg} ${status.text} [font-family:'Ubuntu',Helvetica]`}
                                                >
                                                    {status.label}
                                                </span>
                                                {r.status === 'requested' && !isConfirming && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setConfirmingCancelId(r.id);
                                                            setCancelError(null);
                                                        }}
                                                        className="text-[12px] font-bold text-white/60 hover:text-[#ef4444] transition-colors cursor-pointer underline-offset-2 hover:underline [font-family:'Ubuntu',Helvetica]"
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}
                                                {r.status === 'requested' && isConfirming && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => void confirmCancel(r.id)}
                                                            disabled={isCancelling}
                                                            className="text-[12px] font-bold text-white bg-[#ef4444] hover:bg-[#dc2626] px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [font-family:'Ubuntu',Helvetica]"
                                                        >
                                                            {isCancelling ? 'Cancelando…' : 'Confirmar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setConfirmingCancelId(null);
                                                                setCancelError(null);
                                                            }}
                                                            disabled={isCancelling}
                                                            className="text-[12px] text-white/60 hover:text-white px-2 py-1.5 transition-colors cursor-pointer disabled:opacity-50 [font-family:'Ubuntu',Helvetica]"
                                                        >
                                                            Voltar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isConfirming && !errorForRow && (
                                            <p className="mt-3 text-[12px] text-white/60 [font-family:'Ubuntu',Helvetica]">
                                                Os {r.costSnapshot} pts voltam pro seu saldo na hora.
                                            </p>
                                        )}
                                        {errorForRow && (
                                            <p className="mt-3 text-[12px] text-[#ef4444] [font-family:'Ubuntu',Helvetica]">
                                                {errorForRow}
                                            </p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>
            )}

            {selected && (
                <RewardRedeemModal
                    reward={selected}
                    pointsAvailable={pointsAvailable}
                    savedAddress={savedAddress}
                    onClose={() => setSelected(null)}
                />
            )}
            {editingAddress && (
                <ShippingAddressModal
                    current={savedAddress}
                    onClose={() => setEditingAddress(false)}
                />
            )}
        </div>
    );
}

interface RewardCardProps {
    readonly reward: MgmRewardView;
    readonly pointsAvailable: number;
    readonly familyBlocked: boolean;
    readonly onSelect: () => void;
}

function RewardCard({ reward, pointsAvailable, familyBlocked, onSelect }: RewardCardProps) {
    const canAfford = pointsAvailable >= reward.costPoints;
    const disabled = !canAfford || familyBlocked;
    const isPhysical = reward.type === 'PHYSICAL';

    const renewalText =
        reward.type !== 'PHYSICAL' ? formatRenewalReward(reward.type, reward.metadata) : null;

    const deliveryLabel = isPhysical ? 'Envio físico' : 'Cupom digital';

    return (
        <div className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 flex flex-col transition-colors duration-200 hover:border-[#6528d3]">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                    {deliveryLabel}_
                </span>
                <span className="text-[12px] font-bold tabular-nums text-white px-3 py-1 rounded-full bg-[#6528d3] [font-family:'Ubuntu',Helvetica]">
                    {reward.costPoints} pts
                </span>
            </div>

            <h3 className="mt-5 text-[18px] font-bold text-white leading-tight [font-family:'Ubuntu',Helvetica]">
                {reward.name}
            </h3>

            {renewalText?.fromText && renewalText.toText ? (
                <p className="mt-3 text-[14px] leading-relaxed [font-family:'Ubuntu',Helvetica]">
                    <span className="line-through text-white/40">{renewalText.fromText}</span>{' '}
                    <span className="text-white font-bold">{renewalText.toText}</span>
                </p>
            ) : (
                <p className="mt-3 text-[14px] text-white/70 leading-relaxed [font-family:'Ubuntu',Helvetica]">
                    {reward.description ?? renewalText?.short ?? ''}
                </p>
            )}

            <div className="mt-6 pt-5 border-t border-[#333]">
                {familyBlocked ? (
                    <p className="text-[13px] text-[#ff6b35] font-bold [font-family:'Ubuntu',Helvetica]">
                        Já resgatado nesta categoria
                    </p>
                ) : !canAfford ? (
                    <p className="text-[13px] text-white/60 [font-family:'Ubuntu',Helvetica]">
                        Faltam{' '}
                        <span className="font-bold text-white">
                            {reward.costPoints - pointsAvailable} pts
                        </span>
                    </p>
                ) : (
                    <button
                        type="button"
                        onClick={onSelect}
                        disabled={disabled}
                        className="w-full rounded-lg bg-[#6528d3] hover:bg-[#5020b0] px-4 py-3 text-[14px] font-bold text-white transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [font-family:'Ubuntu',Helvetica]"
                    >
                        Resgatar
                    </button>
                )}
            </div>
        </div>
    );
}
