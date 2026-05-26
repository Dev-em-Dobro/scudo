import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import FeedbackForm from '@/app/components/feedback/FeedbackForm';
import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';

export default async function FeedbackPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen flex dark bg-black text-white [font-family:'Ubuntu',Helvetica] antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-black">
                <Header title="Feedbacks de melhorias" />

                <div className="flex-1 overflow-visible lg:overflow-auto scrollbar-modern">
                    <div className="w-full px-6 md:px-8 py-10 md:py-14 space-y-12">
                        <section>
                            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                                Canal do beta_
                            </span>
                            <h1 className="mt-4 text-3xl md:text-[40px] font-black text-white leading-[1.1] [font-family:'Ubuntu',Helvetica]">
                                Reporte bugs e sugira melhorias
                            </h1>
                            <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                                Descreva o que aconteceu, os passos pra reproduzir e o resultado esperado. Quanto mais objetivo, mais rápido a gente resolve.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 md:p-8">
                                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                                    Enviar feedback_
                                </span>
                                <div className="mt-6">
                                    <FeedbackForm />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
                                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#22c55e] [font-family:'Ubuntu',Helvetica]">
                                        Reporte aqui_
                                    </span>
                                    <ul className="mt-4 space-y-2 text-[14px] text-white/80 list-disc list-inside leading-relaxed [font-family:'Ubuntu',Helvetica]">
                                        <li>Erros e telas quebradas</li>
                                        <li>Fluxos confusos ou com fricção</li>
                                        <li>Sugestões de melhoria de UX</li>
                                        <li>Textos ou instruções confusos</li>
                                    </ul>
                                </div>

                                <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
                                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ff6b35] [font-family:'Ubuntu',Helvetica]">
                                        Não é aqui_
                                    </span>
                                    <ul className="mt-4 space-y-2 text-[14px] text-white/80 list-disc list-inside leading-relaxed [font-family:'Ubuntu',Helvetica]">
                                        <li>Suporte sobre conta de terceiros</li>
                                        <li>Envio de dados pessoais sensíveis</li>
                                        <li>Chamados urgentes de acesso (use os canais oficiais)</li>
                                    </ul>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
