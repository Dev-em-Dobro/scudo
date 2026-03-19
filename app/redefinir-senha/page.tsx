import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ResetPasswordForm from "@/app/components/auth/ResetPasswordForm";
import { auth } from "@/app/lib/auth";
import { LOGO_TEXT } from "@/app/lib/constants";

interface RedefinirSenhaPageProps {
    readonly searchParams: Promise<{
        token?: string;
    }>;
}

export default async function RedefinirSenhaPage({ searchParams }: Readonly<RedefinirSenhaPageProps>) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (session) {
        redirect("/");
    }

    const params = await searchParams;
    const token = typeof params.token === "string" ? params.token : null;

    return (
        <main className="min-h-screen bg-background-dark flex">
            <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 flex-col justify-between p-12 border-r border-border-dark relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-950/60 via-background-dark to-background-dark pointer-events-none" />
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/30">
                        <span
                            className="material-symbols-outlined text-white text-xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            rocket_launch
                        </span>
                    </div>
                    <span className="font-bold text-lg text-white tracking-tight">
                        {LOGO_TEXT.main}
                        <span className="text-primary">{LOGO_TEXT.accent}</span>
                    </span>
                </div>

                <div className="relative space-y-3">
                    <h2 className="text-3xl font-bold text-white leading-snug">
                        Defina uma nova <span className="text-primary">senha segura</span>
                    </h2>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
                        Escolha uma senha forte e exclusiva para proteger seu acesso à plataforma.
                    </p>
                </div>

                <p className="relative text-xs text-slate-400">
                    © {new Date().getFullYear()} CareerQuest. Todos os direitos reservados.
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <ResetPasswordForm token={token} />
            </div>
        </main>
    );
}
