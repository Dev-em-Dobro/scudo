"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import ScudoShieldIcon from "@/app/components/layout/ScudoShieldIcon";
import { authClient } from "@/app/lib/auth-client";
import { signInSchema, type SignInInput } from "@/app/lib/validations/auth";

function AuthError({ message }: Readonly<{ message: string | null }>) {
    if (!message) return null;
    return (
        <div role="alert" className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
            <span className="material-symbols-outlined text-red-400 text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            <p className="text-sm text-red-300">{message}</p>
        </div>
    );
}

interface LoginFormProps {
    studentVerifiedAuthOnly: boolean;
}

export default function LoginForm({ studentVerifiedAuthOnly }: Readonly<LoginFormProps>) {
    const router = useRouter();
    const allowSelfSignup = !studentVerifiedAuthOnly;
    const [authError, setAuthError] = useState<string | null>(null);
    const [socialLoading, setSocialLoading] = useState<"google" | "linkedin" | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInInput>({
        resolver: zodResolver(signInSchema),
        defaultValues: { email: "", password: "", rememberMe: true },
    });

    const onSubmit = handleSubmit(async (values) => {
        setAuthError(null);
        const { error } = await authClient.signIn.email({
            email: values.email,
            password: values.password,
            rememberMe: values.rememberMe,
            callbackURL: "/",
        });
        if (error) {
            setAuthError("Não foi possível fazer login. Verifique seus dados e tente novamente.");
            return;
        }
        router.push("/");
        router.refresh();
    });

    const handleSocial = async (provider: "google" | "linkedin") => {
        setAuthError(null);
        setSocialLoading(provider);
        const { error } = await authClient.signIn.social({
            provider,
            callbackURL: "/",
            errorCallbackURL: "/login",
        });
        if (error) {
            setAuthError("Falha ao iniciar login social. Tente novamente.");
            setSocialLoading(null);
        }
    };

    const busy = isSubmitting || Boolean(socialLoading);

    return (
        <div className="w-full max-w-md">
            {/* Logo — visível apenas em mobile */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-md shadow-primary/30">
                    <ScudoShieldIcon className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-base text-white tracking-tight">
                    SCU<span className="text-primary">DO</span>
                </span>
            </div>

            <div className="space-y-1 mb-7">
                <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
                <p className="text-sm text-slate-300">Entre na sua conta para continuar.</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit} noValidate>
                {/* Destaque para primeiro acesso de alunos */}
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 md:p-5">
                    <p className="text-lg font-semibold text-primary leading-snug">
                        Aluno da formação? Comece por aqui.
                    </p>
                    <p className="mt-1.5 text-sm text-slate-200">
                        No primeiro acesso, ative sua conta antes de entrar com e-mail e senha.
                    </p>
                    <Link
                        href="/acesso"
                        className="mt-3.5 flex items-center justify-center gap-2 w-full rounded-lg border border-primary bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150"
                    >
                        <span
                            className="material-symbols-outlined text-base"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            school
                        </span>
                        {" "}Primeiro acesso de aluno
                    </Link>
                </div>

                {/* E-mail */}
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

                {/* Senha */}
                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        Senha
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px] pointer-events-none">
                            lock
                        </span>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-border-dark bg-surface-dark pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                            {...register("password")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-primary transition-colors"
                        >
                            <span
                                className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                                aria-hidden="true"
                            >
                                {showPassword ? "visibility_off" : "visibility"}
                            </span>
                        </button>
                    </div>
                    {errors.password ? <p className="text-xs text-red-400">{errors.password.message}</p> : null}
                    <p className="text-right">
                        <Link href="/recuperar-senha" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            Esqueci minha senha
                        </Link>
                    </p>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" className="h-4 w-4 accent-primary" {...register("rememberMe")} />
                    <span>Manter sessão ativa</span>
                </label>

                <AuthError message={authError} />

                <button
                    type="submit"
                    disabled={busy}
                    className="cursor-pointer w-full rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                    {isSubmitting ? "Entrando..." : "Entrar"}
                </button>
            </form>

            {allowSelfSignup ? (
                <>
                    <div className="my-5 flex items-center gap-3">
                        <div className="flex-1 h-px bg-border-dark" />
                        <span className="text-xs text-slate-400 uppercase tracking-wide">ou continue com</span>
                        <div className="flex-1 h-px bg-border-dark" />
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSocial("google")}
                            className="cursor-pointer w-full flex items-center justify-center gap-2.5 rounded-lg border border-border-dark bg-surface-dark px-4 py-2.5 text-sm text-slate-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {socialLoading === "google" ? "Conectando..." : "Continuar com Google"}
                        </button>

                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSocial("linkedin")}
                            className="cursor-pointer w-full flex items-center justify-center gap-2.5 rounded-lg border border-border-dark bg-surface-dark px-4 py-2.5 text-sm text-slate-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                            {socialLoading === "linkedin" ? "Conectando..." : "Continuar com LinkedIn"}
                        </button>
                    </div>

                    <p className="mt-7 text-sm text-slate-500">
                        Ainda não tem conta?{" "}
                        <Link href="/cadastro" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                            Criar conta grátis
                        </Link>
                    </p>
                </>
            ) : null}

        </div>
    );
}
