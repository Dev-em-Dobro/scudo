'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { MgmRedemptionAdminView, ShippingInfo } from '@/app/lib/mgm/redemptions';
import ShippingForm, {
    emptyShippingInfo,
    isShippingFormValid,
} from '@/app/indique-e-ganhe/components/ShippingForm';

interface Props {
    readonly pending: readonly MgmRedemptionAdminView[];
    readonly recent: readonly MgmRedemptionAdminView[];
}

type FamilyFilter = 'all' | 'merch-camiseta' | 'merch-livro' | 'renovacao';

const FAMILY_OPTIONS: ReadonlyArray<{ id: FamilyFilter; label: string }> = [
    { id: 'all', label: 'Todas' },
    { id: 'merch-camiseta', label: 'Camiseta' },
    { id: 'merch-livro', label: 'Livro' },
    { id: 'renovacao', label: 'Renovação' },
];

const SHIPPING_EDITABLE_STATUSES = new Set<MgmRedemptionAdminView['status']>([
    'requested',
    'approved',
]);

export default function RedemptionAdminList({ pending, recent }: Props) {
    const router = useRouter();
    const [filter, setFilter] = useState<FamilyFilter>('all');
    const [deliveringId, setDeliveringId] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [editingShippingRow, setEditingShippingRow] =
        useState<MgmRedemptionAdminView | null>(null);
    const [shippingDraft, setShippingDraft] = useState<ShippingInfo>(emptyShippingInfo());
    const [busy, setBusy] = useState(false);

    const filteredPending = useMemo(
        () =>
            filter === 'all'
                ? pending
                : pending.filter((r) => r.rewardFamily === filter),
        [pending, filter],
    );

    async function callAction(url: string, method: string, body?: object) {
        setBusy(true);
        try {
            const response = await fetch(url, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                alert(data.error ?? 'Falhou.');
                return false;
            }
            router.refresh();
            return true;
        } catch (err) {
            console.error(err);
            alert('Erro de rede.');
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function approve(id: string) {
        await callAction(`/api/admin/mgm-redemptions/${id}/approve`, 'POST');
    }

    async function deliver(id: string) {
        const r = pending.find((x) => x.id === id);
        if (!r) return;

        if (r.rewardType !== 'PHYSICAL') {
            setDeliveringId(id);
            setCouponCode('');
            return;
        }
        if (!confirm(`Marcar "${r.rewardName}" como entregue?`)) return;
        await callAction(`/api/admin/mgm-redemptions/${id}/deliver`, 'POST', {
            deliveryInfo: { deliveredVia: 'manual' },
        });
    }

    async function confirmDeliverDigital() {
        if (!deliveringId || !couponCode.trim()) return;
        const row = pending.find((x) => x.id === deliveringId);
        const deliveredVia = row?.rewardType === 'PIX' ? 'pix' : 'hubla-coupon';
        const ok = await callAction(
            `/api/admin/mgm-redemptions/${deliveringId}/deliver`,
            'POST',
            { deliveryInfo: { couponCode: couponCode.trim(), deliveredVia } },
        );
        if (ok) {
            setDeliveringId(null);
            setCouponCode('');
        }
    }

    async function reject(id: string) {
        const reason = prompt('Motivo da rejeição:');
        if (!reason || !reason.trim()) return;
        await callAction(`/api/admin/mgm-redemptions/${id}/reject`, 'POST', {
            reason: reason.trim(),
        });
    }

    function startEditShipping(row: MgmRedemptionAdminView) {
        setEditingShippingRow(row);
        setShippingDraft({
            name: row.shippingInfo?.name ?? '',
            phone: row.shippingInfo?.phone ?? '',
            address: row.shippingInfo?.address ?? '',
            city: row.shippingInfo?.city ?? '',
            state: row.shippingInfo?.state ?? '',
            zip: row.shippingInfo?.zip ?? '',
            notes: row.shippingInfo?.notes ?? '',
        });
    }

    async function confirmEditShipping() {
        if (!editingShippingRow || !isShippingFormValid(shippingDraft)) return;
        const ok = await callAction(
            `/api/admin/mgm-redemptions/${editingShippingRow.id}/shipping`,
            'PATCH',
            shippingDraft,
        );
        if (ok) {
            setEditingShippingRow(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                    Fila de resgates
                </h2>
                <div className="inline-flex rounded-lg border border-[#333] p-1 bg-[#1a1a1a]">
                    {FAMILY_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFilter(opt.id)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                                filter === opt.id
                                    ? 'bg-violet-500/20 text-[#a78bfa]'
                                    : 'text-white/70'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <RedemptionTable
                rows={filteredPending}
                onApprove={approve}
                onDeliver={deliver}
                onReject={reject}
                onEditShipping={startEditShipping}
                busy={busy}
            />

            {recent.length > 0 && (
                <details className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-5">
                    <summary className="text-sm font-semibold text-white/80 cursor-pointer">
                        Histórico recente ({recent.length})
                    </summary>
                    <div className="mt-4">
                        <RedemptionTable rows={recent} historical />
                    </div>
                </details>
            )}

            {/* Modal: gerar cupom digital / registrar PIX */}
            {deliveringId && (() => {
                const deliveringRow = pending.find((x) => x.id === deliveringId);
                const isPixDelivery = deliveringRow?.rewardType === 'PIX';
                return (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setDeliveringId(null);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl border border-[#333] bg-[#1a1a1a] p-6">
                        <h3 className="text-lg font-bold text-white">
                            {isPixDelivery ? 'Registrar pagamento PIX' : 'Entregar prêmio digital'}
                        </h3>
                        <p className="text-xs text-white/70 mt-1.5">
                            {isPixDelivery
                                ? 'Pague o PIX e cole aqui o ID da transação ou comprovante.'
                                : 'Cole o código de cupom gerado na Hubla.'}
                        </p>
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder={isPixDelivery ? 'Ex.: E1234... (ID da transação PIX)' : 'Ex.: DEVQUEST30-XYZ'}
                            className="mt-4 w-full rounded-lg border border-[#333] bg-black px-3 py-2 text-sm text-white font-mono"
                            autoFocus
                        />
                        <div className="mt-5 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setDeliveringId(null)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/80 hover:text-white cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeliverDigital}
                                disabled={busy || !couponCode.trim()}
                                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 cursor-pointer disabled:opacity-50"
                            >
                                Marcar entregue
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Modal: editar endereço de resgate (Gap 2) */}
            {editingShippingRow && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setEditingShippingRow(null);
                    }}
                >
                    <div className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8 max-h-[90vh] overflow-y-auto scrollbar-modern">
                        <h3 className="text-lg font-bold text-white">
                            Editar endereço — {editingShippingRow.rewardName}
                        </h3>
                        <p className="text-xs text-white/70 mt-1">
                            Aluno: {editingShippingRow.userName} · {editingShippingRow.userEmail}
                        </p>
                        <div className="mt-5">
                            <ShippingForm
                                value={shippingDraft}
                                onChange={setShippingDraft}
                                showNotes={editingShippingRow.rewardFamily === 'merch-camiseta'}
                                notesLabel={
                                    editingShippingRow.rewardFamily === 'merch-camiseta'
                                        ? 'Tamanho da camiseta'
                                        : 'Observação'
                                }
                            />
                        </div>
                        <div className="mt-6 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditingShippingRow(null)}
                                disabled={busy}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/80 hover:text-white cursor-pointer disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmEditShipping}
                                disabled={busy || !isShippingFormValid(shippingDraft)}
                                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {busy ? 'Salvando…' : 'Salvar endereço'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface RedemptionTableProps {
    readonly rows: readonly MgmRedemptionAdminView[];
    readonly onApprove?: (id: string) => void;
    readonly onDeliver?: (id: string) => void;
    readonly onReject?: (id: string) => void;
    readonly onEditShipping?: (row: MgmRedemptionAdminView) => void;
    readonly busy?: boolean;
    readonly historical?: boolean;
}

function RedemptionTable({
    rows,
    onApprove,
    onDeliver,
    onReject,
    onEditShipping,
    busy,
    historical,
}: RedemptionTableProps) {
    if (rows.length === 0) {
        return (
            <div className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-10 text-center">
                <p className="text-sm text-white/70">
                    {historical ? 'Sem histórico ainda.' : 'Fila vazia. 🎉'}
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-[#333] bg-[#1a1a1a] overflow-hidden">
            <ul className="divide-y divide-[#333]">
                {rows.map((row) => {
                    const canEditShipping =
                        !historical &&
                        row.shippingInfo &&
                        SHIPPING_EDITABLE_STATUSES.has(row.status) &&
                        onEditShipping;
                    return (
                        <li key={row.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-white">
                                        {row.rewardName}
                                        <span className="ml-2 text-xs font-normal text-white/50">
                                            · {row.costSnapshot} pts
                                        </span>
                                    </p>
                                    <p className="text-xs text-white/70 mt-1">
                                        {row.userName} · {row.userEmail}
                                    </p>
                                    <p className="text-xs text-white/50 mt-0.5">
                                        Solicitado:{' '}
                                        {new Date(row.requestedAt).toLocaleString('pt-BR')}
                                    </p>
                                    {row.shippingInfo && (
                                        <div className="mt-2 text-xs text-white/70 bg-slate-800/30 rounded px-3 py-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-white/80">
                                                        {row.shippingInfo.name}{' '}
                                                        {row.shippingInfo.phone &&
                                                            `· ${row.shippingInfo.phone}`}
                                                    </p>
                                                    <p>
                                                        {row.shippingInfo.address},{' '}
                                                        {row.shippingInfo.city}/
                                                        {row.shippingInfo.state} — CEP{' '}
                                                        {row.shippingInfo.zip}
                                                    </p>
                                                    {row.shippingInfo.notes && (
                                                        <p className="text-white/50 mt-1">
                                                            Obs: {row.shippingInfo.notes}
                                                        </p>
                                                    )}
                                                </div>
                                                {canEditShipping && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditShipping!(row)}
                                                        disabled={busy}
                                                        className="text-[11px] font-semibold text-[#a78bfa] hover:text-white underline-offset-2 hover:underline cursor-pointer shrink-0 disabled:opacity-50"
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {row.deliveryInfo?.couponCode && (
                                        <p className="text-xs text-emerald-300 mt-1 font-mono">
                                            {row.rewardType === 'PIX' ? 'PIX enviado' : 'Cupom entregue'}:{' '}
                                            {row.deliveryInfo.couponCode}
                                        </p>
                                    )}
                                    {row.rejectedReason && (
                                        <p className="text-xs text-red-300 mt-1">
                                            Rejeitado: {row.rejectedReason}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <StatusBadge status={row.status} />
                                    {!historical && row.status === 'requested' && onApprove && (
                                        <>
                                            {row.rewardType === 'PHYSICAL' && (
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => onApprove(row.id)}
                                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer disabled:opacity-50"
                                                >
                                                    Aprovar
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => onDeliver?.(row.id)}
                                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer disabled:opacity-50"
                                            >
                                                {row.rewardType === 'PHYSICAL'
                                                    ? 'Marcar entregue'
                                                    : row.rewardType === 'PIX'
                                                      ? 'Registrar PIX'
                                                      : 'Gerar cupom'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => onReject?.(row.id)}
                                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 cursor-pointer disabled:opacity-50"
                                            >
                                                Rejeitar
                                            </button>
                                        </>
                                    )}
                                    {!historical && row.status === 'approved' && onDeliver && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => onDeliver(row.id)}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer disabled:opacity-50"
                                        >
                                            Marcar entregue
                                        </button>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function StatusBadge({ status }: { status: MgmRedemptionAdminView['status'] }) {
    const tones: Record<typeof status, string> = {
        requested: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        approved: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
        delivered: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        rejected: 'bg-red-500/10 text-red-300 border-red-500/30',
        cancelled: 'bg-slate-500/10 text-white/80 border-slate-500/30',
    };
    return (
        <span
            className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded border ${tones[status]}`}
        >
            {status}
        </span>
    );
}
