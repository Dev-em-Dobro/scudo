"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ScudoShieldIcon from "@/app/components/layout/ScudoShieldIcon";

const emailSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Informe seu e-mail")
        .pipe(z.email({ message: "Digite um e-mail válido" })),
});

type EmailInput = z.infer<typeof emailSchema>;

type FlowStatus =
    | "idle"
    | "loading"
    | "created"
    | "created_no_email"
    | "existing_user"
    | "not_student"
    | "error";

interface ApiResponse {
    status?: "created" | "existing_user" | "not_student";
    emailSent?: boolean;
    error?: string;
    warning?: string;
}

// ─── Tela de sucesso ─────────────────────────────────────────────────────────
function SuccessScreen() {
    return (
        <div className="w-full max-w-md text-center space-y-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mx-auto">
                <span
                    className="material-symbols-outlined text-primary text-4xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    mark_email_read
                </span>
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">E-mail enviado!</h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                    Enviamos suas credenciais de acesso para o seu e-mail. Verifique sua
                    caixa de entrada (e o spam).
                </p>
            </div>
            <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 shadow-md shadow-primary/20"
            >
                <span className="material-symbols-outlined text-base" aria-hidden="true">login</span>
                {" "}Ir para o login
            </Link>
        </div>
    );
}

// ─── Tela conta criada sem e-mail ─────────────────────────────────────────────
function CreatedNoEmailScreen({ warning }: Readonly<{ warning: string | null }>) {
    return (
        <div className="w-full max-w-md text-center space-y-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-500/15 mx-auto">
                <span
                    className="material-symbols-outlined text-yellow-400 text-4xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    warning
                </span>
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Conta criada</h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                    {warning ?? "Sua conta foi criada, mas não conseguimos enviar o e-mail. Entre em contato com o suporte."}
                </p>
            </div>
            <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150"
            >
                Ir para o login
            </Link>
        </div>
    );
}

// ─── Tela usuário já existe ───────────────────────────────────────────────────
function ExistingUserScreen() {
    return (
        <div className="w-full max-w-md text-center space-y-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mx-auto">
                <span
                    className="material-symbols-outlined text-primary text-4xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    person_check
                </span>
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Você já tem uma conta!</h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                    Este e-mail já está cadastrado no Scudo. Acesse com suas
                    credenciais normalmente.
                </p>
            </div>
            <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 shadow-md shadow-primary/20"
            >
                <span className="material-symbols-outlined text-base" aria-hidden="true">login</span>
                {" "}Ir para o login
            </Link>
        </div>
    );
}

// ─── Tela não é aluno ─────────────────────────────────────────────────────────
function NotStudentScreen() {
    return (
        <div className="w-full max-w-md text-center space-y-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-700/40 mx-auto">
                <span
                    className="material-symbols-outlined text-slate-300 text-4xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    person_search
                </span>
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">E-mail não encontrado</h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                    Não encontramos esse e-mail na nossa plataforma de cursos. Você
                    pode criar uma conta normalmente ou fazer login se já tiver cadastro.
                </p>
            </div>
            <div className="space-y-3">
                <Link
                    href="/cadastro"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 shadow-md shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
                    {" "}Criar conta grátis
                </Link>
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-lg border border-border-dark bg-surface-dark hover:border-primary/50 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-150"
                >
                    Já tenho conta — Fazer login
                </Link>
            </div>
        </div>
    );
}

// ─── Formulário principal ─────────────────────────────────────────────────────
export default function StudentAccessForm() {
    const [flowStatus, setFlowStatus] = useState<FlowStatus>("idle");
    const [warning, setWarning] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<EmailInput>({
        resolver: zodResolver(emailSchema),
    });

    const onSubmit = handleSubmit(async (values) => {
        setFlowStatus("loading");
        setWarning(null);

        try {
            const res = await fetch("/api/auth/student-access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email }),
            });

            const data: ApiResponse = await res.json();

            if (!res.ok) {
                setFlowStatus("error");
                return;
            }

            if (data.status === "created") {
                if (data.emailSent === false) {
                    setWarning(data.warning ?? null);
                    setFlowStatus("created_no_email");
                } else {
                    setFlowStatus("created");
                }
            } else if (data.status === "existing_user") {
                setFlowStatus("existing_user");
            } else if (data.status === "not_student") {
                setFlowStatus("not_student");
            } else {
                setFlowStatus("error");
            }
        } catch {
            setFlowStatus("error");
        }
    });

    // ── Estados resultantes ──────────────────────────────────────────────────
    if (flowStatus === "created") return <SuccessScreen />;
    if (flowStatus === "created_no_email") return <CreatedNoEmailScreen warning={warning} />;
    if (flowStatus === "existing_user") return <ExistingUserScreen />;
    if (flowStatus === "not_student") return <NotStudentScreen />;

    if (flowStatus === "error") {
        return (
            <div className="w-full max-w-md text-center space-y-5">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/15 mx-auto">
                    <span
                        className="material-symbols-outlined text-red-400 text-4xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        error
                    </span>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Algo deu errado</h2>
                    <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                        Não foi possível processar sua solicitação. Tente novamente em breve.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setFlowStatus("idle")}
                    className="w-full rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    // ── Formulário (idle / loading) ──────────────────────────────────────────
    return (
        <div className="w-full max-w-md">
            {/* Logo mobile */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-md shadow-primary/30">
                    <ScudoShieldIcon className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-base text-white tracking-tight">
                    SCU<span className="text-primary">DO</span>
                </span>
            </div>

            {/* Badge Área de Alunos */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 mb-5">
                <span
                    className="material-symbols-outlined text-primary text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    school
                </span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Área de Alunos
                </span>
            </div>

            <div className="space-y-1 mb-7">
                <h1 className="text-2xl font-bold text-white">
                    Acesse com seu e-mail
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                    Use o mesmo e-mail cadastrado na nossa plataforma de cursos.
                    Vamos verificar e enviar suas credenciais de acesso.
                </p>
            </div>

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
                <div className="space-y-1.5">
                    <label
                        htmlFor="email"
                        className="text-xs font-semibold text-slate-300 uppercase tracking-wide"
                    >
                        E-mail da plataforma de cursos
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
                            disabled={isSubmitting || flowStatus === "loading"}
                            className="w-full rounded-lg border border-border-dark bg-surface-dark pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all disabled:opacity-50"
                            {...register("email")}
                        />
                    </div>
                    {errors.email ? (
                        <p className="text-xs text-red-400">{errors.email.message}</p>
                    ) : null}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || flowStatus === "loading"}
                    className="cursor-pointer w-full rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                    {isSubmitting || flowStatus === "loading" ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg
                                className="animate-spin h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            Verificando...
                        </span>
                    ) : (
                        "Verificar e-mail"
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-dark space-y-3">
                <p className="text-sm text-slate-500 text-center">
                    Não é aluno ou já tem conta?
                </p>
                <div className="flex gap-3">
                    <Link
                        href="/login"
                        className="flex-1 text-center rounded-lg border border-border-dark bg-surface-dark hover:border-primary/50 hover:bg-primary/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all duration-150"
                    >
                        Fazer login
                    </Link>
                    <Link
                        href="/cadastro"
                        className="flex-1 text-center rounded-lg border border-border-dark bg-surface-dark hover:border-primary/50 hover:bg-primary/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all duration-150"
                    >
                        Criar conta
                    </Link>
                </div>
            </div>
        </div>
    );
}
