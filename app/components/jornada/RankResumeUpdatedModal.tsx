'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

type RankResumeUpdatedModalProps = {
    open: boolean;
    rankName: string | null;
    projectCount: number;
    onClose: () => void;
};

export default function RankResumeUpdatedModal({
    open,
    rankName,
    projectCount,
    onClose,
}: RankResumeUpdatedModalProps) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
            return;
        }

        if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className="fixed left-1/2 top-1/2 m-0 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#333] bg-[#1a1a1a] p-5 shadow-2xl backdrop:bg-slate-950/70"
            aria-labelledby="rank-resume-updated-title"
        >
            <div>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                            workspace_premium
                        </span>
                        <div>
                            <h3 id="rank-resume-updated-title" className="text-sm font-bold text-white">
                                Rank {rankName ?? 'concluído'} — currículo atualizado!
                            </h3>
                            <div className="mt-1 space-y-2">
                                <p className="text-sm text-white/70">
                                    A Scudo incluiu os projetos do curso no seu currículo ATS ({projectCount} projeto(s) no documento).
                                </p>
                                <p className="text-sm text-white/70">
                                    Baixe quando quiser em <span className="text-white font-semibold">Meu Painel</span> — formato otimizado para Gupy e outros sistemas de triagem.
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar aviso"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#333] text-white/70 hover:text-white/90 hover:border-[#6528d3]/40 transition-colors"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
                            close
                        </span>
                    </button>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex cursor-pointer items-center px-3 py-2 text-xs font-bold rounded-lg border border-[#333] text-white/70 hover:text-white/90 transition-colors uppercase tracking-wide"
                    >
                        Continuar jornada
                    </button>
                    <Link
                        href="/"
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-[#6528d3] bg-[#6528d3] hover:bg-[#5020b0] text-white transition-colors uppercase tracking-wide"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                            download
                        </span>
                        <span>Ir ao Meu Painel</span>
                    </Link>
                </div>
            </div>
        </dialog>
    );
}
