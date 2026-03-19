"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/app/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/app/lib/validations/auth";

interface ResetPasswordFormProps {
    readonly token: string | null;
}

function toPortugueseResetPasswordError(message?: string) {
    const normalized = (message ?? "").toUpperCase();

    if (normalized.includes("INVALID_TOKEN")) {
        return "Este link de redefinição é inválido ou expirou. Solicite um novo link e tente novamente.";
    }

    if (normalized.includes("PASSWORD_TOO_SHORT")) {
        return "A nova senha está muito curta. Use pelo menos 8 caracteres.";
    }

    if (normalized.includes("PASSWORD_TOO_LONG")) {
        return "A nova senha está muito longa. Use no máximo 128 caracteres.";
    }

    if (normalized.includes("TOO_MANY_REQUESTS") || normalized.includes("RATE_LIMIT")) {
        return "Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.";
    }

    return "Não foi possível redefinir sua senha. Solicite um novo link e tente novamente.";
}

interface PasswordFieldProps {
    readonly id: "password" | "confirmPassword";
    readonly label: string;
    readonly placeholder: string;
    readonly visible: boolean;
    readonly toggleVisibility: () => void;
    readonly registration: ReturnType<typeof useForm<ResetPasswordInput>>["register"];
    readonly error?: string;
}

function PasswordField({
    id,
    label,
    placeholder,
    visible,
    toggleVisibility,
    registration,
    error,
}: Readonly<PasswordFieldProps>) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px] pointer-events-none">
                    lock
                </span>
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-border-dark bg-surface-dark pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                    {...registration(id)}
                />
                <button
                    type="button"
                    onClick={toggleVisibility}
                    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-primary transition-colors"
                >
                    <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                    >
                        {visible ? "visibility_off" : "visibility"}
                    </span>
                </button>
            </div>
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>
    );
}

function InvalidTokenState() {
    return (
        <div className="w-full max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-white">Link inválido</h1>
            <p className="text-sm text-slate-300">
                Este link de recuperação está incompleto ou expirou. Solicite um novo link para redefinir sua senha.
            </p>
            <Link
                href="/recuperar-senha"
                className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
                Solicitar novo link
            </Link>
        </div>
    );
}

function SuccessState() {
    return (
        <div className="space-y-4">
            <output className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">
                <span
                    className="material-symbols-outlined text-base shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                >
                    check_circle
                </span>
                <span>Sua senha foi redefinida com sucesso.</span>
            </output>

            <Link
                href="/login"
                className="inline-flex items-center justify-center w-full rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all"
            >
                Ir para login
            </Link>
        </div>
    );
}

export default function ResetPasswordForm({ token }: Readonly<ResetPasswordFormProps>) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    if (!token) return <InvalidTokenState />;

    const onSubmit = handleSubmit(async (values) => {
        setRequestError(null);

        try {
            const result = await authClient.resetPassword({
                newPassword: values.password,
                token,
            });

            if (result.error) {
                setRequestError(toPortugueseResetPasswordError(result.error.message));
                return;
            }

            setIsDone(true);
        } catch {
            setRequestError(toPortugueseResetPasswordError());
        }
    });

    return (
        <div className="w-full max-w-md">
            <div className="space-y-1 mb-7">
                <h1 className="text-2xl font-bold text-white">Definir nova senha</h1>
                <p className="text-sm text-slate-300">Escolha uma nova senha para acessar sua conta.</p>
            </div>

            {isDone ? (
                <SuccessState />
            ) : (
                <form className="space-y-4" onSubmit={onSubmit} noValidate>
                    <PasswordField
                        id="password"
                        label="Nova senha"
                        placeholder="Mínimo 8 caracteres"
                        visible={showPassword}
                        toggleVisibility={() => setShowPassword((current) => !current)}
                        registration={register}
                        error={errors.password?.message}
                    />

                    <PasswordField
                        id="confirmPassword"
                        label="Confirmar nova senha"
                        placeholder="Repita sua nova senha"
                        visible={showConfirmPassword}
                        toggleVisibility={() => setShowConfirmPassword((current) => !current)}
                        registration={register}
                        error={errors.confirmPassword?.message}
                    />

                    {requestError ? (
                        <div role="alert" className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
                            <span className="material-symbols-outlined text-red-400 text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                                error
                            </span>
                            <p className="text-sm text-red-300">{requestError}</p>
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="cursor-pointer w-full rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                    >
                        {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
                    </button>
                </form>
            )}

            <p className="mt-7 text-sm text-slate-400">
                <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                    Voltar para login
                </Link>
            </p>
        </div>
    );
}
