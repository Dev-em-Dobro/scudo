'use client';

import { useState } from 'react';

import GeneratedResumeWorkspaceModal from '@/app/components/dashboard/GeneratedResumeWorkspaceModal';
import { useAuth } from '@/app/providers/AuthProvider';

function formatUpdatedAt(value: string | null) {
    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

export default function GeneratedResumeCard() {
    const { user, isAuthenticated } = useAuth();
    const [workspaceMode, setWorkspaceMode] = useState<'preview' | 'edit' | null>(null);

    const { generatedResume } = user;
    const updatedLabel = formatUpdatedAt(generatedResume.updatedAt);

    if (!generatedResume.available) {
        return (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-[#6528d3]/10 border border-[#6528d3]/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                            description
                        </span>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Currículo Scudo (ATS)</h2>
                        <p className="mt-1 text-sm text-white/70">
                            Ao concluir um rank na jornada, a Scudo monta automaticamente seu currículo com os projetos do curso — pronto para Gupy e outros ATS.
                        </p>
                        <p className="mt-2 text-xs text-white/50">
                            Conclua o rank Bronze ou superior para liberar o currículo aqui no painel.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-[#1a1a1a] border border-[#6528d3]/30 rounded-xl p-5">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-[#6528d3]/10 border border-[#6528d3]/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                            description
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <h2 className="text-sm font-bold text-white">Currículo Scudo (ATS)</h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border bg-violet-500/10 text-[#a78bfa] border-violet-500/30">
                                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>
                                    auto_awesome
                                </span>
                                Atualizado automaticamente
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-white/70">
                            {generatedResume.projectCount} projeto(s) do curso incluídos
                            {generatedResume.rankName ? ` — última atualização no rank ${generatedResume.rankName}` : ''}.
                            {updatedLabel ? ` Atualizado em ${updatedLabel}.` : ''}
                        </p>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setWorkspaceMode('preview')}
                                disabled={!isAuthenticated}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-[#333] text-white/80 hover:text-white hover:border-[#6528d3]/40 transition-colors uppercase tracking-wide disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                    visibility
                                </span>
                                Pré-visualizar
                            </button>
                            <button
                                type="button"
                                onClick={() => setWorkspaceMode('edit')}
                                disabled={!isAuthenticated}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-[#6528d3] bg-[#6528d3] hover:bg-[#5020b0] text-white transition-colors uppercase tracking-wide disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>
                                    edit_square
                                </span>
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <GeneratedResumeWorkspaceModal
                open={workspaceMode !== null}
                mode={workspaceMode ?? 'preview'}
                onClose={() => setWorkspaceMode(null)}
            />
        </>
    );
}
