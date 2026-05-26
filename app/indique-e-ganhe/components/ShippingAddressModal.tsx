'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { ShippingInfo } from '@/app/lib/mgm/redemptions';
import { MGM_PURPLE, PANEL_SHADOW } from '@/app/indique-e-ganhe/components/theme';
import ShippingForm, {
    emptyShippingInfo,
    isShippingFormValid,
} from '@/app/indique-e-ganhe/components/ShippingForm';

interface ShippingAddressModalProps {
    readonly current: ShippingInfo | null;
    readonly onClose: () => void;
}

/**
 * Modal standalone pro aluno cadastrar/editar o endereço de entrega salvo
 * no perfil. Usado fora do contexto de resgate (botão "Editar endereço" no
 * card de saldo do PremiosTab). Salva em `UserProfile.mgmShippingAddress`
 * — pré-preenche todos os próximos resgates físicos.
 *
 * NÃO inclui o campo `notes`: tamanho de camiseta etc. é dado por-resgate,
 * não por-aluno.
 */
export default function ShippingAddressModal({
    current,
    onClose,
}: ShippingAddressModalProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shipping, setShipping] = useState<ShippingInfo>(() =>
        current
            ? {
                  name: current.name,
                  phone: current.phone ?? '',
                  address: current.address,
                  city: current.city,
                  state: current.state,
                  zip: current.zip,
                  notes: '',
              }
            : emptyShippingInfo(),
    );

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    async function submit() {
        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/api/mgm/shipping-address', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: shipping.name.trim(),
                    phone: shipping.phone?.trim() || undefined,
                    address: shipping.address.trim(),
                    city: shipping.city.trim(),
                    state: shipping.state.trim().toUpperCase(),
                    zip: shipping.zip.trim(),
                }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(data.error ?? 'Não foi possível salvar o endereço.');
                setSubmitting(false);
                return;
            }
            router.refresh();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Erro de rede. Tente novamente.');
            setSubmitting(false);
        }
    }

    const isValid = isShippingFormValid(shipping);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shipping-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8 max-h-[90vh] overflow-y-auto scrollbar-modern"
                style={{ boxShadow: PANEL_SHADOW }}
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3
                            id="shipping-modal-title"
                            className="text-lg font-bold text-white tracking-tight"
                        >
                            Endereço de entrega
                        </h3>
                        <p className="text-xs text-white/70 mt-1">
                            Salvar aqui pré-preenche todos os próximos resgates físicos.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/50 hover:text-white p-1 cursor-pointer"
                        aria-label="Fechar"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                <div className="mt-5">
                    <ShippingForm value={shipping} onChange={setShipping} />
                </div>

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
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white/80 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={submitting || !isValid}
                        className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: MGM_PURPLE }}
                    >
                        {submitting ? 'Salvando…' : 'Salvar endereço'}
                    </button>
                </div>
            </div>
        </div>
    );
}
