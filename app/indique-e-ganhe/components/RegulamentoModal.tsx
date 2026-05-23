'use client';

import { useEffect, useState } from 'react';

import { MGM_PURPLE, PANEL_SHADOW } from '@/app/indique-e-ganhe/components/theme';

interface RegulamentoModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly pointsBase: number;
    readonly guaranteeDays: number;
}

interface Secao {
    readonly titulo: string;
    readonly corpo: string;
}

function buildSecoes(pointsBase: number, guaranteeDays: number): Secao[] {
    return [
        {
            titulo: 'Elegibilidade',
            corpo:
                'O programa de indicações é exclusivo para alunos do DevQuest com conta ativa (aluno oficial verificado na plataforma).',
        },
        {
            titulo: 'Ganho de pontos',
            corpo: `Você ganha pontos a cada indicação bem-sucedida — quando uma nova pessoa compra o DevQuest pelo seu link de indicação e mantém a compra após o período de garantia. Cada indicação válida vale ${pointsBase} pontos (sujeito a multiplicador em temporadas especiais).`,
        },
        {
            titulo: 'Indicação válida',
            corpo:
                'Só conta a compra feita pelo seu link de indicação pessoal (com o seu código ?ref=). Compras sem o registro da indicação não são contabilizadas. Não é permitido se auto-indicar nem indicar quem já é aluno do DevQuest.',
        },
        {
            titulo: 'Período de garantia',
            corpo: `Cada indicação fica "pendente" durante o período de garantia de ${guaranteeDays} dias após a compra. Passado esse prazo sem reembolso, os pontos ficam disponíveis para resgate.`,
        },
        {
            titulo: 'Validade dos pontos',
            corpo:
                'Os pontos não possuem data de expiração. Uma vez contabilizados, ficam disponíveis a qualquer momento enquanto o programa estiver ativo — você resgata quando quiser.',
        },
        {
            titulo: 'Cancelamento e reembolso',
            corpo: `Se a pessoa indicada pedir reembolso dentro do período de garantia (${guaranteeDays} dias), os pontos ganhos com aquela indicação são deduzidos do seu saldo.`,
        },
        {
            titulo: 'Troca de pontos por prêmios',
            corpo:
                'Os pontos podem ser trocados por prêmios na aba Prêmios, desde que você tenha o saldo necessário. Itens físicos (camiseta, livro) são produzidos sob demanda e enviados pra você. Descontos de renovação são entregues como cupom aplicável na próxima renovação do DevQuest. Prêmios podem ser alterados sem aviso prévio.',
        },
        {
            titulo: 'Famílias de prêmios e exclusividade',
            corpo:
                'Os prêmios são agrupados em três famílias: Camiseta, Livro e Renovação. Você pode resgatar no máximo um prêmio de cada família. Os descontos de renovação (30%, 40%, 50% e 1 ano grátis) pertencem à mesma família e NÃO são acumulativos — você escolhe um só. Resgates rejeitados ou cancelados liberam novamente a família.',
        },
        {
            titulo: 'Cancelamento de resgate',
            corpo:
                'Enquanto o resgate estiver no status "Solicitado" (antes da nossa equipe processar), você pode cancelar a qualquer momento na própria aba Prêmios e os pontos voltam pro seu saldo. Após a aprovação, o cancelamento depende de aprovação da equipe.',
        },
        {
            titulo: 'Ranking',
            corpo:
                'A aba Ranking mostra um leaderboard público dos alunos indicadores. Você pode optar por não aparecer (toggle "Aparecer no ranking público" na própria aba Ranking) — ainda assim continua acumulando pontos normalmente.',
        },
        {
            titulo: 'Restrições de uso dos pontos',
            corpo:
                'Pontos não podem ser transferidos entre contas, trocados por dinheiro ou usados para qualquer finalidade além das previstas no programa.',
        },
        {
            titulo: 'Modificações no programa',
            corpo:
                'A Dobro reserva-se o direito de modificar, suspender ou encerrar o programa a qualquer momento. Alterações relevantes são comunicadas na própria área do programa.',
        },
        {
            titulo: 'Conduta e uso indevido',
            corpo:
                'Tentativas de fraude, auto-indicação, criação de contas falsas ou qualquer uso indevido levam à desqualificação e à perda dos pontos acumulados.',
        },
    ];
}

export default function RegulamentoModal({
    open,
    onClose,
    pointsBase,
    guaranteeDays,
}: RegulamentoModalProps) {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        // setState dentro do rAF callback (assíncrono) — não dispara o
        // react-hooks/set-state-in-effect. O modal é montado/desmontado pelo
        // pai (render condicional), então `shown` nasce false a cada abertura.
        const raf = requestAnimationFrame(() => setShown(true));
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    const secoes = buildSecoes(pointsBase, guaranteeDays);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar regulamento"
                onClick={onClose}
                className={`absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default transition-opacity duration-200 ${
                    shown ? 'opacity-100' : 'opacity-0'
                }`}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Regulamento do programa Indique e Ganhe"
                style={{ boxShadow: PANEL_SHADOW }}
                className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark transition-all duration-200 ${
                    shown ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
                }`}
            >
                <div className="flex items-center justify-between gap-3 px-6 md:px-7 py-4 border-b border-border-light dark:border-border-dark shrink-0">
                    <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Indique e Ganhe
                        </span>
                        <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                            Regulamento
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer active:scale-[0.95]"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="overflow-y-auto scrollbar-modern px-6 md:px-7 py-6 space-y-6">
                    {secoes.map((secao) => (
                        <section key={secao.titulo} className="space-y-1.5">
                            <h3
                                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                                style={{ color: MGM_PURPLE }}
                            >
                                {secao.titulo}
                            </h3>
                            <p className="text-sm text-slate-300 leading-relaxed max-w-[64ch]">
                                {secao.corpo}
                            </p>
                        </section>
                    ))}
                    <p className="text-xs text-slate-500 pt-3 border-t border-border-light dark:border-border-dark">
                        Dúvidas? Fale com a equipe de Sucesso do Aluno da Dobro.
                    </p>
                </div>
            </div>
        </div>
    );
}
