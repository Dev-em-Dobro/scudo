'use client';

import { useState, type ReactNode } from 'react';

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
            a: 'Não. Uma vez que o ponto seja contabilizado, você pode resgatá-lo a qualquer momento — os pontos não expiram enquanto o programa estiver ativo.',
        },
        {
            q: 'E se a pessoa comprar sem ser pelo meu link?',
            a: 'Compras feitas sem o registro da indicação não são contabilizadas. A indicação precisa ser feita pelo seu link pessoal (que carrega o seu código de indicação) para que a venda seja atribuída a você.',
        },
        {
            q: 'Posso somar indicações?',
            a: `Sim. Não há limite de pessoas diferentes que você pode convidar. A indicação vira válida quando o amigo compra pelo seu link e permanece após o período de garantia (${guaranteeDays} dias após a compra). Após realizar um resgate, os pontos usados são descontados do saldo.`,
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
                    famílias de prêmios, conduta e o que conta como uso indevido. Ao participar
                    do programa você aceita esses termos integralmente.{' '}
                    <button
                        type="button"
                        onClick={onOpenRegulamento}
                        className="font-bold text-[#a78bfa] hover:text-white underline-offset-2 hover:underline transition-colors cursor-pointer"
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
        <section>
            <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                        Ajuda_
                    </span>
                    <h2 className="mt-3 text-[24px] font-bold text-white [font-family:'Ubuntu',Helvetica]">
                        Perguntas frequentes
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setRegulamentoOpen(true)}
                    className="rounded-lg bg-[#6528d3] hover:bg-[#5020b0] px-5 py-3 text-[13px] font-bold text-white transition-colors duration-200 cursor-pointer [font-family:'Ubuntu',Helvetica]"
                >
                    Ver regulamento completo
                </button>
            </div>

            <div className="divide-y divide-[#333] border-t border-b border-[#333]">
                {faq.map((item, idx) => {
                    const isOpen = openIdx === idx;
                    return (
                        <div key={item.q}>
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => setOpenIdx(isOpen ? null : idx)}
                                className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group"
                            >
                                <span
                                    className={`text-[16px] font-bold transition-colors [font-family:'Ubuntu',Helvetica] ${
                                        isOpen ? 'text-[#a78bfa]' : 'text-white group-hover:text-[#a78bfa]'
                                    }`}
                                >
                                    {item.q}
                                </span>
                                <span
                                    className={`text-[20px] font-black shrink-0 transition-transform duration-200 [font-family:'Ubuntu',Helvetica] ${
                                        isOpen ? 'text-[#a78bfa] rotate-45' : 'text-white/50'
                                    }`}
                                    aria-hidden="true"
                                >
                                    +
                                </span>
                            </button>
                            {isOpen ? (
                                <div className="text-[15px] text-white/70 leading-relaxed pb-6 pr-10 max-w-[70ch] [font-family:'Ubuntu',Helvetica]">
                                    {item.a}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <p className="text-[13px] text-white/50 mt-6 [font-family:'Ubuntu',Helvetica]">
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
