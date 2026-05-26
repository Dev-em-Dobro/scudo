'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { MgmRewardView } from '@/app/lib/mgm/rewards';
import type { ShippingInfo } from '@/app/lib/mgm/redemptions';
import { MGM_PURPLE, PANEL_SHADOW } from '@/app/indique-e-ganhe/components/theme';
import {
    formatRenewalReward,
    iconForFamily,
} from '@/app/indique-e-ganhe/components/rewardFormatting';
import ShippingForm, {
    isShippingFormValid,
} from '@/app/indique-e-ganhe/components/ShippingForm';

interface RewardRedeemModalProps {
    readonly reward: MgmRewardView;
    readonly pointsAvailable: number;
    readonly savedAddress: ShippingInfo | null;
    readonly onClose: () => void;
}

/**
 * Modal de confirmação de resgate (spec v0.4 §v0.4-D).
 *
 * Família `renovacao` mostra aviso explícito sobre exclusividade
 * (descontos não acumulativos). PHYSICAL pede endereço (pré-preenchido
 * se já estiver no UserProfile).
 */
export default function RewardRedeemModal({
    reward,
    pointsAvailable,
    savedAddress,
    onClose,
}: RewardRedeemModalProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isPhysical = reward.type === 'PHYSICAL';
    const isRenovacao = reward.rewardFamily === 'renovacao';

    const [shipping, setShipping] = useState<ShippingInfo>(() => ({
        name: savedAddress?.name ?? '',
        phone: savedAddress?.phone ?? '',
        address: savedAddress?.address ?? '',
        city: savedAddress?.city ?? '',
        state: savedAddress?.state ?? '',
        zip: savedAddress?.zip ?? '',
        notes: savedAddress?.notes ?? '',
    }));

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    async function submit() {
        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/api/mgm/redemptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rewardSlug: reward.slug,
                    shippingInfo: isPhysical ? shipping : null,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(data.error ?? 'Não foi possível registrar o resgate.');
                setSubmitting(false);
                return;
            }

            router.refresh();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Erro de rede. Tente novamente em instantes.');
            setSubmitting(false);
        }
    }

    const renewalText =
        reward.type !== 'PHYSICAL'
            ? formatRenewalReward(reward.type, reward.metadata)
            : null;

    const isFormValid = !isPhysical || isShippingFormValid(shipping);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="redeem-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8 max-h-[90vh] overflow-y-auto scrollbar-modern"
                style={{ boxShadow: PANEL_SHADOW }}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: 'lab(62.8239% 34.9159 -60.0512 / 0.12)' }}
                        >
                            <span
                                className="material-symbols-outlined text-[26px]"
                                style={{
                                    fontVariationSettings: "'FILL' 1",
                                    color: MGM_PURPLE,
                                }}
                            >
                                {iconForFamily(reward.rewardFamily)}
                            </span>
                        </span>
                        <div>
                            <h3
                                id="redeem-modal-title"
                                className="text-lg font-bold text-white tracking-tight"
                            >
                                Resgatar: {reward.name}
                            </h3>
                            <p className="text-xs text-white/70 mt-0.5">
                                Custo: <span className="font-semibold text-white">{reward.costPoints} pts</span>
                                {' · '}Saldo após:{' '}
                                <span className="font-semibold text-white">
                                    {pointsAvailable - reward.costPoints} pts
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors p-1 cursor-pointer"
                        aria-label="Fechar"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                {renewalText && (
                    <div className="mt-5 rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
                        <p className="text-sm text-white/90">{renewalText.headline}</p>
                        <p className="text-xs text-white/50 mt-1">
                            Cupom aplicado na sua próxima renovação anual do DevQuest.
                        </p>
                    </div>
                )}

                {isRenovacao && (
                    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                        <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                            <span
                                className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                warning
                            </span>
                            Atenção: descontos não acumulativos
                        </p>
                        <p className="text-xs text-amber-200/80 mt-1.5 leading-relaxed">
                            Ao resgatar este desconto, você <strong>não poderá resgatar
                            nenhum outro prêmio da família Renovação</strong> (30%, 40%, 50%
                            ou 1 ano grátis). Você ainda pode resgatar a camiseta e o
                            livro separadamente.
                        </p>
                    </div>
                )}

                {isPhysical && (
                    <div className="mt-5 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-[2px] text-white/50">
                            Endereço de entrega
                        </h4>
                        {savedAddress && (
                            <p className="text-xs text-white/50">
                                Endereço pré-preenchido com o último que você cadastrou.
                                Pode editar antes de confirmar.
                            </p>
                        )}
                        <ShippingForm
                            value={shipping}
                            onChange={setShipping}
                            showNotes={reward.rewardFamily === 'merch-camiseta'}
                            notesLabel="Tamanho da camiseta (P/M/G/GG)"
                        />
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                <div className="mt-6 flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white/80 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={submitting || !isFormValid}
                        className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ backgroundColor: MGM_PURPLE }}
                    >
                        {submitting ? 'Enviando…' : 'Confirmar resgate'}
                    </button>
                </div>
            </div>
        </div>
    );
}

