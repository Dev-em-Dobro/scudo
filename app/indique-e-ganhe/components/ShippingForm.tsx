'use client';

import type { ShippingInfo } from '@/app/lib/mgm/redemptions';

/**
 * Formulário controlado de endereço de entrega.
 *
 * Usado em 3 lugares (DRY):
 *  1. `RewardRedeemModal` — preenche shippingInfo no resgate inicial (showNotes=true pra camiseta)
 *  2. `ShippingAddressModal` — edita endereço salvo no perfil do aluno
 *  3. `AdminShippingEditModal` — admin corrige endereço de um resgate
 */

interface ShippingFormProps {
    readonly value: ShippingInfo;
    readonly onChange: (next: ShippingInfo) => void;
    /** Mostra o campo `notes` (default false). Quando true, usa o `notesLabel`. */
    readonly showNotes?: boolean;
    readonly notesLabel?: string;
}

export default function ShippingForm({
    value,
    onChange,
    showNotes = false,
    notesLabel = 'Observação',
}: ShippingFormProps) {
    function update<K extends keyof ShippingInfo>(key: K, v: ShippingInfo[K]) {
        onChange({ ...value, [key]: v });
    }

    return (
        <div className="grid gap-3">
            <Field
                label="Nome completo"
                value={value.name}
                onChange={(v) => update('name', v)}
                required
            />
            <Field
                label="Telefone (com DDD)"
                value={value.phone ?? ''}
                onChange={(v) => update('phone', v)}
            />
            <Field
                label="Endereço (rua, número, complemento)"
                value={value.address}
                onChange={(v) => update('address', v)}
                required
            />
            <div className="grid grid-cols-2 gap-3">
                <Field
                    label="Cidade"
                    value={value.city}
                    onChange={(v) => update('city', v)}
                    required
                />
                <Field
                    label="UF"
                    value={value.state}
                    onChange={(v) => update('state', v.toUpperCase())}
                    required
                />
            </div>
            <Field
                label="CEP"
                value={value.zip}
                onChange={(v) => update('zip', v)}
                required
            />
            {showNotes && (
                <Field
                    label={notesLabel}
                    value={value.notes ?? ''}
                    onChange={(v) => update('notes', v)}
                />
            )}
        </div>
    );
}

interface FieldProps {
    readonly label: string;
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly required?: boolean;
}

function Field({ label, value, onChange, required }: FieldProps) {
    return (
        <label className="block">
            <span className="text-xs font-semibold text-slate-400">
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
            </span>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="mt-1 w-full rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-background-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
        </label>
    );
}

export function emptyShippingInfo(): ShippingInfo {
    return { name: '', phone: '', address: '', city: '', state: '', zip: '', notes: '' };
}

export function isShippingFormValid(value: ShippingInfo): boolean {
    return Boolean(
        value.name.trim() &&
            value.address.trim() &&
            value.city.trim() &&
            value.state.trim() &&
            value.zip.trim(),
    );
}
