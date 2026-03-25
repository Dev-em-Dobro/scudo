'use client';

import { useState } from 'react';

type FeedbackState = {
    type: 'success' | 'error';
    message: string;
};

const PASSWORD_MIN_LENGTH = 8;

export default function ChangePasswordSection() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);

    async function handleSubmit(event: { preventDefault: () => void }) {
        event.preventDefault();
        setFeedback(null);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setFeedback({
                type: 'error',
                message: 'Preencha os três campos de senha para continuar.',
            });
            return;
        }

        if (newPassword.length < PASSWORD_MIN_LENGTH) {
            setFeedback({
                type: 'error',
                message: `A nova senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
            });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setFeedback({
                type: 'error',
                message: 'A confirmação da nova senha não confere.',
            });
            return;
        }

        if (currentPassword === newPassword) {
            setFeedback({
                type: 'error',
                message: 'A nova senha deve ser diferente da senha atual.',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    revokeOtherSessions,
                }),
            });

            const payload = (await response.json().catch(() => null)) as
                | { message?: string; error?: string }
                | null;

            if (!response.ok) {
                setFeedback({
                    type: 'error',
                    message:
                        payload?.message ??
                        payload?.error ??
                        'Não foi possível alterar sua senha. Verifique a senha atual e tente novamente.',
                });
                return;
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setFeedback({
                type: 'success',
                message: 'Senha alterada com sucesso.',
            });
        } catch {
            setFeedback({
                type: 'error',
                message: 'Falha de rede ao tentar alterar sua senha.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-5 shadow-sm rounded-xl">
            <div className="flex items-center gap-2 mb-4">
                <span
                    className="material-symbols-outlined text-amber-400"
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                >
                    lock
                </span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Segurança da Conta</h2>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                        <span>Senha Atual</span>
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            maxLength={128}
                            required
                        />
                    </label>

                    <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                        <span>Nova Senha</span>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                minLength={PASSWORD_MIN_LENGTH}
                                maxLength={128}
                                required
                            />
                            <button
                                type="button"
                                aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                                onClick={() => setShowNewPassword((current) => !current)}
                                className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-500 dark:text-slate-300 hover:text-primary transition-colors"
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                                    aria-hidden="true"
                                >
                                    {showNewPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </label>
                </div>

                <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                    <span>Confirmar Nova Senha</span>
                    <div className="relative">
                        <input
                            type={showConfirmNewPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                            value={confirmNewPassword}
                            onChange={(event) => setConfirmNewPassword(event.target.value)}
                            minLength={PASSWORD_MIN_LENGTH}
                            maxLength={128}
                            required
                        />
                        <button
                            type="button"
                            aria-label={showConfirmNewPassword ? 'Ocultar confirmação da nova senha' : 'Mostrar confirmação da nova senha'}
                            onClick={() => setShowConfirmNewPassword((current) => !current)}
                            className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-500 dark:text-slate-300 hover:text-primary transition-colors"
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                                aria-hidden="true"
                            >
                                {showConfirmNewPassword ? 'visibility_off' : 'visibility'}
                            </span>
                        </button>
                    </div>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={revokeOtherSessions}
                        onChange={(event) => setRevokeOtherSessions(event.target.checked)}
                    />
                    <span>Encerrar outras sessões ativas após alterar senha</span>
                </label>

                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-400 dark:text-slate-300">
                        Use uma senha forte com letras, números e símbolos.
                    </p>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="cursor-pointer px-4 py-2 text-xs font-bold rounded border border-primary bg-primary hover:bg-primary/90 text-white transition-colors uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
                    </button>
                </div>

                {feedback ? (
                    <p
                        role="alert"
                        className={`text-xs ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                        {feedback.message}
                    </p>
                ) : null}
            </form>
        </section>
    );
}
