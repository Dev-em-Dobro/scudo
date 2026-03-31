import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ScudoShieldIcon from "@/app/components/layout/ScudoShieldIcon";
import StudentAccessForm from "@/app/components/auth/StudentAccessForm";
import { auth } from "@/app/lib/auth";
import { LOGO_TEXT } from "@/app/lib/constants";
import { isStudentVerifiedAuthOnlyEnabled } from "@/app/lib/featureFlags";

const HIGHLIGHTS = [
    { icon: "school", label: "Acesso exclusivo para alunos da plataforma" },
    { icon: "auto_awesome", label: "Compatibilidade com vagas calculada pela sua stack" },
    { icon: "work_outline", label: "Vagas selecionadas para você todo dia" },
    { icon: "bar_chart", label: "Métricas do mercado em tempo real" },
];

export default async function AcessoPage() {
    const studentVerifiedAuthOnly = isStudentVerifiedAuthOnlyEnabled();

    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (session) {
        redirect("/");
    }

    return (
        <main className="min-h-screen bg-background-dark flex">
            {/* Painel de marca — oculto em mobile */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 flex-col justify-between p-12 border-r border-border-dark relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-950/60 via-background-dark to-background-dark pointer-events-none" />
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

                {/* Logo */}
                <div className="relative flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/30">
                        <ScudoShieldIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-lg text-white tracking-tight">
                        {LOGO_TEXT.main}
                        <span className="text-primary">{LOGO_TEXT.accent}</span>
                    </span>
                </div>

                {/* Hero */}
                <div className="relative space-y-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
                        <span
                            className="material-symbols-outlined text-primary text-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            school
                        </span>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            Área exclusiva de alunos
                        </span>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-white leading-snug">
                            Da aula à{" "}
                            <span className="text-primary">vaga certa</span>
                        </h2>
                        <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
                            Como aluno da nossa plataforma, você tem acesso prioritário
                            ao Scudo — sua central de oportunidades personalizada.
                        </p>
                    </div>

                    <ul className="space-y-3">
                        {HIGHLIGHTS.map((h) => (
                            <li key={h.label} className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 shrink-0">
                                    <span
                                        className="material-symbols-outlined text-primary text-base"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        {h.icon}
                                    </span>
                                </span>
                                <span className="text-sm text-slate-200">{h.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Rodapé */}
                <p className="relative text-xs text-slate-400">
                    © {new Date().getFullYear()} Scudo. Todos os direitos reservados.
                </p>
            </div>

            {/* Painel do formulário */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <StudentAccessForm studentVerifiedAuthOnly={studentVerifiedAuthOnly} />
            </div>
        </main>
    );
}
