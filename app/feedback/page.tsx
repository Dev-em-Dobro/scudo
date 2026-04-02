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
    <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
        <Header title="Feedbacks de melhorias" />

        <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">
          <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6 space-y-3">
            <h2 className="text-lg font-bold text-white">Canal de feedback do beta</h2>
            <p className="text-sm text-slate-300">
              Use este canal para relatar bugs, dificuldades de navegação, problemas de conteúdo e sugestões de melhoria da plataforma.
            </p>
            <p className="text-sm text-slate-300">
              Para acelerar a análise, descreva o contexto, os passos executados e o resultado observado. Quanto mais objetivo, melhor o diagnóstico.
            </p>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Enviar feedback</h3>
              <FeedbackForm />
            </section>

            <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 md:p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Escopo deste canal</h3>

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <p className="text-sm font-semibold text-violet-400">O que reportar aqui</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-200 list-disc list-inside">
                  <li>Erros na plataforma (telas quebradas, ações que não funcionam).</li>
                  <li>Fluxos confusos ou com fricção durante o uso.</li>
                  <li>Sugestões de melhoria de funcionalidade e experiência.</li>
                  <li>Textos, instruções ou labels que geram dúvida.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-300">O que não entra neste canal</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-200 list-disc list-inside">
                  <li>Solicitações de suporte sobre conta pessoal de terceiros.</li>
                  <li>Envio de documentos sensíveis ou dados pessoais de outras pessoas.</li>
                  <li>Chamados urgentes de acesso: use os canais oficiais de atendimento.</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
