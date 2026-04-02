import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import logoComNome from "@/app/assets/logo-com-nome.png";
import LoginForm from "@/app/components/auth/LoginForm";
import { auth } from "@/app/lib/auth";
import { isStudentVerifiedAuthOnlyEnabled } from "@/app/lib/featureFlags";

export default async function LoginPage() {
    const studentVerifiedAuthOnly = isStudentVerifiedAuthOnlyEnabled();

    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (session) {
        redirect("/");
    }

    return (
        <main className="min-h-screen bg-background-dark flex">
            {/* Painel de marca — oculto em mobile; roxo + verde em equilíbrio */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 flex-col min-h-screen p-12 border-r border-border-dark relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/55 via-background-dark to-background-dark pointer-events-none" />
                <div className="absolute -top-28 -left-28 w-[22rem] h-[22rem] rounded-full bg-primary/12 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-emerald-500/18 blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 -right-24 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

                {/* Logo + texto centralizados na área útil; rodapé fixo embaixo */}
                <div className="relative z-10 flex flex-1 flex-col justify-center items-center min-h-0">
                    <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
                        <Image
                            src={logoComNome}
                            alt="Scudo"
                            className="h-auto w-full max-w-[260px] object-contain"
                            sizes="(max-width: 1280px) 260px, 320px"
                            unoptimized
                            priority
                        />
                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold leading-snug text-white">
                                Proteja sua{" "}
                                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                                    evolução
                                </span>
                            </h2>
                            <p className="text-sm leading-relaxed text-slate-300/95">
                                Conectamos seu perfil técnico às vagas certas com precisão — sem desperdício de tempo.
                            </p>
                            <div
                                className="mx-auto h-px w-16 max-w-full bg-gradient-to-r from-transparent via-emerald-500/45 to-transparent"
                                aria-hidden
                            />
                        </div>
                    </div>
                </div>

                <p className="relative z-10 shrink-0 pt-8 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} Scudo. Todos os direitos reservados.
                </p>
            </div>

            {/* Painel do formulário — leve atmosfera verde + roxo */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
                <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_90%_20%,rgba(101,40,211,0.09),transparent_55%),radial-gradient(ellipse_70%_50%_at_10%_80%,rgba(16,185,129,0.08),transparent_50%)]"
                    aria-hidden
                />
                <div className="relative z-10 w-full flex justify-center">
                    <LoginForm studentVerifiedAuthOnly={studentVerifiedAuthOnly} />
                </div>
            </div>
        </main>
    );
}

