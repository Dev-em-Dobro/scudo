'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { MgmRewardView } from '@/app/lib/mgm/rewards';
import type { MgmRedemptionView, ShippingInfo } from '@/app/lib/mgm/redemptions';
import RewardRedeemModal from '@/app/indique-e-ganhe/components/RewardRedeemModal';
import ShippingAddressModal from '@/app/indique-e-ganhe/components/ShippingAddressModal';
import {
    MGM_PURPLE,
    MGM_PURPLE_SOFT,
    PANEL_SHADOW,
} from '@/app/indique-e-ganhe/components/theme';
import {
    formatRenewalReward,
    iconForFamily,
} from '@/app/indique-e-ganhe/components/rewardFormatting';

interface PremiosTabProps {
    readonly rewards: readonly MgmRewardView[];
    readonly redemptions: readonly MgmRedemptionView[];
    readonly pointsAvailable: number;
    readonly savedAddress: ShippingInfo | null;
}

const STATUS_LABELS: Record<MgmRedemptionView['status'], { label: string; tone: string }> = {
    requested: { label: 'Solicitado', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
    approved: { label: 'Aprovado', tone: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
    delivered: { label: 'Entregue', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
    rejected: { label: 'Rejeitado', tone: 'text-red-300 bg-red-500/10 border-red-500/30' },
    cancelled: { label: 'Cancelado', tone: 'text-slate-300 bg-slate-500/10 border-slate-500/30' },
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

    // Famílias com resgate ativo — pra desabilitar e mostrar tooltip.
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
        <div className="space-y-6">
            {/* Saldo em destaque */}
            <div
                className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-5 md:p-6"
                style={{ boxShadow: PANEL_SHADOW }}
            >
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Saldo disponível
                        </p>
                        <p
                            className="mt-2 text-3xl font-bold tabular-nums"
                            style={{ color: pointsAvailable < 0 ? '#f87171' : MGM_PURPLE }}
                        >
                            {pointsAvailable} pts
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Pontos em garantia ainda não contam — aparecem aqui após 15 dias.
                        </p>
                    </div>
                    <span
                        className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
                        style={{ backgroundColor: MGM_PURPLE_SOFT }}
                    >
                        <span
                            className="material-symbols-outlined text-[30px]"
                            style={{ fontVariationSettings: "'FILL' 1", color: MGM_PURPLE }}
                        >
                            account_balance_wallet
                        </span>
                    </span>
                </div>

                {pointsAvailable < 0 && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                        <p className="text-sm font-semibold text-red-300 flex items-center gap-2">
                            <span
                                className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                info
                            </span>
                            Saldo abaixo de zero
                        </p>
                        <p className="text-xs text-red-200/85 mt-1.5 leading-relaxed">
                            Uma indicação anterior foi <strong>reembolsada</strong> e os pontos
                            dela voltaram, deixando seu saldo negativo em{' '}
                            <strong>{Math.abs(pointsAvailable)} pts</strong>. Os prêmios já
                            resgatados ficam com você — nada é cobrado de volta. Pra voltar a
                            resgatar, basta acumular novas indicações até o saldo subir acima de
                            zero.
                        </p>
                    </div>
                )}

                {/* Endereço de entrega (Gap 1) */}
                <div className="mt-4 pt-4 border-t border-border-light/40 dark:border-border-dark/40 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Endereço de entrega
                        </p>
                        {savedAddress ? (
                            <p className="text-xs text-slate-400 mt-1 truncate">
                                {savedAddress.name} · {savedAddress.city}/{savedAddress.state} · CEP {savedAddress.zip}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500 mt-1">
                                Nenhum endereço cadastrado — pediremos no próximo resgate físico.
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setEditingAddress(true)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors hover:opacity-90"
                        style={{ color: MGM_PURPLE, backgroundColor: MGM_PURPLE_SOFT }}
                    >
                        {savedAddress ? 'Editar endereço' : 'Cadastrar endereço'}
                    </button>
                </div>
            </div>

            {/* Vitrine */}
            <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
                    Catálogo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </div>

            {/* Histórico */}
            {redemptions.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
                        Seus resgates
                    </h3>
                    <div
                        className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark overflow-hidden"
                        style={{ boxShadow: PANEL_SHADOW }}
                    >
                        <ul className="divide-y divide-border-light dark:divide-border-dark">
                            {redemptions.map((r) => {
                                const status = STATUS_LABELS[r.status];
                                const isConfirming = confirmingCancelId === r.id;
                                const isCancelling = cancellingId === r.id;
                                const errorForRow = cancelError?.id === r.id ? cancelError.message : null;
                                return (
                                    <li key={r.id} className="px-5 py-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span
                                                    className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                                                    style={{ backgroundColor: MGM_PURPLE_SOFT }}
                                                >
                                                    <span
                                                        className="material-symbols-outlined text-[19px]"
                                                        style={{
                                                            fontVariationSettings: "'FILL' 1",
                                                            color: MGM_PURPLE,
                                                        }}
                                                    >
                                                        {iconForFamily(r.rewardFamily)}
                                                    </span>
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {r.rewardName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {r.costSnapshot} pts ·{' '}
                                                        {new Date(r.requestedAt).toLocaleDateString('pt-BR')}
                                                    </p>
                                                    {r.rejectedReason && (
                                                        <p className="text-xs text-red-400 mt-0.5">
                                                            Motivo: {r.rejectedReason}
                                                        </p>
                                                    )}
                                                    {r.deliveryInfo?.couponCode && (
                                                        <p className="text-xs text-emerald-300 mt-0.5 font-mono">
                                                            Cupom: {r.deliveryInfo.couponCode}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                    className={`text-[11px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded border ${status.tone}`}
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
                                                        className="text-xs text-slate-400 hover:text-red-300 transition-colors cursor-pointer underline-offset-2 hover:underline"
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}
                                                {r.status === 'requested' && isConfirming && (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => void confirmCancel(r.id)}
                                                            disabled={isCancelling}
                                                            className="text-xs font-semibold text-red-300 hover:text-red-200 px-2 py-1 rounded border border-red-500/40 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                            className="text-xs text-slate-500 hover:text-slate-300 px-1.5 py-1 transition-colors cursor-pointer disabled:opacity-50"
                                                        >
                                                            Voltar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isConfirming && !errorForRow && (
                                            <p className="text-xs text-slate-500 mt-2 pl-12">
                                                Os {r.costSnapshot} pts voltam pro seu saldo na hora.
                                            </p>
                                        )}
                                        {errorForRow && (
                                            <p className="text-xs text-red-300 mt-2 pl-12 flex items-center gap-1.5">
                                                <span
                                                    className="material-symbols-outlined text-[14px]"
                                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                                >
                                                    error
                                                </span>
                                                {errorForRow}
                                            </p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
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

    const deliveryBadge = isPhysical
        ? { icon: 'local_shipping', label: 'Envio físico' }
        : { icon: 'redeem', label: 'Cupom digital' };

    return (
        <div
            className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-5 flex flex-col"
            style={{ boxShadow: PANEL_SHADOW }}
        >
            <div className="flex items-center justify-between">
                <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: MGM_PURPLE_SOFT }}
                >
                    <span
                        className="material-symbols-outlined text-[26px]"
                        style={{ fontVariationSettings: "'FILL' 1", color: MGM_PURPLE }}
                    >
                        {iconForFamily(reward.rewardFamily)}
                    </span>
                </span>
                <span
                    className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-full"
                    style={{
                        backgroundColor: MGM_PURPLE_SOFT,
                        color: MGM_PURPLE,
                    }}
                >
                    {reward.costPoints} pts
                </span>
            </div>
            <h4 className="mt-4 text-base font-bold text-white tracking-tight leading-tight">
                {reward.name}
            </h4>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 w-fit">
                <span
                    className="material-symbols-outlined text-[13px]"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                >
                    {deliveryBadge.icon}
                </span>
                {deliveryBadge.label}
            </span>
            {renewalText?.fromText && renewalText.toText ? (
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    <span className="line-through text-slate-600">{renewalText.fromText}</span>{' '}
                    <span className="text-white font-semibold">{renewalText.toText}</span>
                </p>
            ) : (
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    {reward.description ?? renewalText?.short ?? ''}
                </p>
            )}

            <div className="mt-5 pt-4 border-t border-border-light/30 dark:border-border-dark/40">
                {familyBlocked ? (
                    <p className="text-xs text-amber-300 flex items-center gap-1.5">
                        <span
                            className="material-symbols-outlined text-[15px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            block
                        </span>
                        Já resgatado nesta categoria
                    </p>
                ) : !canAfford ? (
                    <p className="text-xs text-slate-500">
                        Faltam <span className="font-semibold text-slate-300">
                            {reward.costPoints - pointsAvailable} pts
                        </span>
                    </p>
                ) : (
                    <button
                        type="button"
                        onClick={onSelect}
                        disabled={disabled}
                        className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: MGM_PURPLE }}
                    >
                        Resgatar
                    </button>
                )}
            </div>
        </div>
    );
}
