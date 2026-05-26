'use client';

import { useState, type ReactNode } from 'react';

import {
    MGM_PURPLE,
    MGM_PURPLE_SOFT,
    PANEL_SHADOW,
} from '@/app/indique-e-ganhe/components/theme';
import RegulamentoModal from '@/app/indique-e-ganhe/components/RegulamentoModal';

interface FaqSectionProps {
    readonly pointsBase: number;
    readonly guaranteeDays: number;
}

interface QA {
    readonly q: string;
    readonly a: ReactNode;
}

function buildFaq(
    pointsBase: number,
    guaranteeDays: number,
    onOpenRegulamento: () => void,
): QA[] {
    return [
        {
            q: 'Como funciona a indicação?',
            a: 'A indicação é feita pelo seu link pessoal. Sempre que alguém compra o DevQuest pelo seu link, você ganha pontos. Esses pontos podem ser trocados por prêmios na seção de Prêmios da área de indicações.',
        },
        {
            q: 'Quantos pontos vale uma indicação?',
            a: `Cada indicação válida vale ${pointsBase} pontos. Em temporadas especiais os pontos são multiplicados — então é a melhor hora pra indicar. Quanto mais você indica, mais acumula.`,
        },
        {
            q: 'Quem pode indicar e ser indicado?',
            a: 'Qualquer aluno do DevQuest com conta ativa pode indicar. E pode ser indicada qualquer pessoa que ainda não seja aluna e queira começar a estudar programação com a gente.',
        },
        {
            q: 'Os pontos têm prazo de validade?',
            a: 'Não! Uma vez que o ponto seja contabilizado, você pode resgatá-lo a qualquer momento — os pontos não expiram enquanto o programa estiver ativo.',
        },
        {
            q: 'E se a pessoa comprar sem ser pelo meu link?',
            a: 'Compras feitas sem o registro da indicação não são contabilizadas. A indicação precisa ser feita pelo seu link pessoal (que carrega o seu código de indicação) para que a venda seja atribuída a você.',
        },
        {
            q: 'Posso somar indicações?',
            a: `Sim! Não há limite de pessoas diferentes que você pode convidar. A indicação vira válida quando o amigo compra pelo seu link e permanece após o período de garantia (${guaranteeDays} dias após a compra). Após realizar um resgate, os pontos usados são descontados do saldo.`,
        },
        {
            q: 'Como faço o resgate dos pontos?',
            a: 'Vá na aba Prêmios e escolha o que quer trocar. Você pode resgatar uma camiseta, um livro e um desconto na renovação — mas os descontos de renovação não são acumulativos (escolhe um só entre 30%, 40%, 50% ou 1 ano grátis). A equipe da Dobro processa o pedido em até alguns dias úteis.',
        },
        {
            q: 'Onde leio o regulamento completo do programa?',
            a: (
                <>
                    O regulamento traz todas as regras de elegibilidade, ganho de pontos,
                    famílias de prêmios, conduta e o que conta como uso indevido. Ao
                    participar do programa você aceita esses termos integralmente.{' '}
                    <button
                        type="button"
                        onClick={onOpenRegulamento}
                        className="font-semibold underline-offset-2 hover:underline cursor-pointer"
                        style={{ color: MGM_PURPLE }}
                    >
                        Abrir regulamento completo →
                    </button>
                </>
            ),
        },
    ];
}

export default function FaqSection({ pointsBase, guaranteeDays }: FaqSectionProps) {
    const [openIdx, setOpenIdx] = useState<number | null>(0);
    const [regulamentoOpen, setRegulamentoOpen] = useState(false);
    const faq = buildFaq(pointsBase, guaranteeDays, () => setRegulamentoOpen(true));

    return (
        <section
            className="rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-6 md:p-7"
            style={{ boxShadow: PANEL_SHADOW }}
        >
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Ajuda
                    </span>
                    <h2 className="mt-1 text-lg font-bold text-white tracking-tight">
                        Perguntas frequentes
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setRegulamentoOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.97]"
                    style={{ color: MGM_PURPLE, backgroundColor: MGM_PURPLE_SOFT }}
                >
                    <span
                        className="material-symbols-outlined text-[17px]"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                        description
                    </span>
                    Ver regulamento completo
                </button>
            </div>

            <div className="mt-4 divide-y divide-border-light dark:divide-border-dark border-t border-border-light dark:border-border-dark">
                {faq.map((item, idx) => {
                    const isOpen = openIdx === idx;
                    return (
                        <div key={item.q}>
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => setOpenIdx(isOpen ? null : idx)}
                                className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer group"
                            >
                                <span
                                    className="text-sm font-semibold transition-colors"
                                    style={{ color: isOpen ? MGM_PURPLE : undefined }}
                                >
                                    <span
                                        className={isOpen ? '' : 'text-slate-200 group-hover:text-white'}
                                    >
                                        {item.q}
                                    </span>
                                </span>
                                <span
                                    className={`material-symbols-outlined text-[20px] shrink-0 transition-transform duration-200 ${
                                        isOpen ? 'rotate-180' : 'text-slate-500'
                                    }`}
                                    style={{
                                        fontVariationSettings: "'FILL' 0",
                                        color: isOpen ? MGM_PURPLE : undefined,
                                    }}
                                >
                                    expand_more
                                </span>
                            </button>
                            {isOpen ? (
                                <div className="text-sm text-slate-400 leading-relaxed pb-5 pr-8 max-w-[68ch]">
                                    {item.a}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-slate-500 mt-5">
                Ainda com dúvida? Fale com a equipe de Sucesso do Aluno da Dobro.
            </p>

            {regulamentoOpen ? (
                <RegulamentoModal
                    open
                    onClose={() => setRegulamentoOpen(false)}
                    pointsBase={pointsBase}
                    guaranteeDays={guaranteeDays}
                />
            ) : null}
        </section>
    );
}
