"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/app/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/app/lib/validations/auth";

function toPortugueseForgotPasswordError(message?: string) {
    const normalized = (message ?? "").toUpperCase();

    if (normalized.includes("RESET PASSWORD ISN'T ENABLED")) {
        return "A recuperação de senha está temporariamente indisponível. Tente novamente mais tarde.";
    }

    if (normalized.includes("TOO_MANY_REQUESTS") || normalized.includes("RATE_LIMIT")) {
        return "Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.";
    }

    return "Não foi possível processar sua solicitação agora. Tente novamente em instantes.";
}

function FormFeedback({
    message,
    kind,
}: Readonly<{ message: string | null; kind: "success" | "error" }>) {
    if (!message) return null;

    const containerClass =
        kind === "success"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/20 bg-red-500/10 text-red-300";

    const icon = kind === "success" ? "check_circle" : "error";

    return (
        <div role="alert" className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm ${containerClass}`}>
            <span
                className="material-symbols-outlined text-base shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
            >
                {icon}
            </span>
            <p>{message}</p>
        </div>
    );
}

export default function ForgotPasswordForm() {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = handleSubmit(async (values) => {
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const redirectTo = `${globalThis.window.location.origin}/redefinir-senha`;

            const result = await authClient.requestPasswordReset({
                email: values.email,
                redirectTo,
            });

            if (result.error) {
                setErrorMessage(toPortugueseForgotPasswordError(result.error.message));
                return;
            }

            // Mensagem neutra para evitar enumeração de contas.
            setSuccessMessage("Se este e-mail existir no sistema, você receberá um link para redefinir sua senha.");
        } catch {
            setErrorMessage(toPortugueseForgotPasswordError());
        }
    });

    return (
        <div className="w-full max-w-md">
            <div className="space-y-1 mb-7">
                <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
                <p className="text-sm text-slate-300">Digite seu e-mail para receber o link de redefinição.</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit} noValidate>
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        E-mail
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px] pointer-events-none">
                            mail
                        </span>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="seu@email.com"
                            className="w-full rounded-lg border border-border-dark bg-surface-dark pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                            {...register("email")}
                        />
                    </div>
                    {errors.email ? <p className="text-xs text-red-400">{errors.email.message}</p> : null}
                </div>

                <FormFeedback kind="error" message={errorMessage} />
                <FormFeedback kind="success" message={successMessage} />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer w-full rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                    {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
                </button>
            </form>

            <p className="mt-7 text-sm text-slate-400">
                Lembrou sua senha?{" "}
                <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                    Voltar para login
                </Link>
            </p>
        </div>
    );
}
