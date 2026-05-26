import { headers } from "next/headers";
import { redirect } from "next/navigation";

import BrandLogo from "@/app/components/layout/BrandLogo";
import StudentAccessForm from "@/app/components/auth/StudentAccessForm";
import { auth } from "@/app/lib/auth";
import { isStudentVerifiedAuthOnlyEnabled } from "@/app/lib/featureFlags";

const HIGHLIGHTS = [
    "Acesso exclusivo pra aluno da plataforma",
    "Matching de vagas pela sua stack",
    "Vagas selecionadas todo dia",
    "Métricas do mercado em tempo real",
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
        <main className="min-h-screen bg-black flex [font-family:'Ubuntu',Helvetica]">
            {/* Painel de marca — oculto em mobile */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 flex-col justify-between p-12 border-r border-[#333] bg-[#0d0d0d]">
                <BrandLogo logoClassName="h-10 w-auto" titleClassName="h-7 w-auto" priority />

                <div className="space-y-8">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                            Área exclusiva_
                        </span>
                        <h1 className="mt-4 text-[40px] font-black text-white leading-[1.05] [font-family:'Ubuntu',Helvetica]">
                            Sua central de oportunidades
                        </h1>
                        <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-xs [font-family:'Ubuntu',Helvetica]">
                            Como aluno, você tem acesso prioritário ao Scudo.
                        </p>
                    </div>

                    <ul className="space-y-3">
                        {HIGHLIGHTS.map((h) => (
                            <li key={h} className="flex items-start gap-3">
                                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#6528d3] shrink-0" />
                                <span className="text-[14px] text-white/80 [font-family:'Ubuntu',Helvetica]">{h}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-[12px] text-white/40 [font-family:'Ubuntu',Helvetica]">
                    © {new Date().getFullYear()} Scudo
                </p>
            </div>

            {/* Painel do formulário */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <StudentAccessForm studentVerifiedAuthOnly={studentVerifiedAuthOnly} />
            </div>
        </main>
    );
}
