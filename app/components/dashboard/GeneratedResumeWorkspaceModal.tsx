'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import GeneratedResumeEditor from '@/app/components/dashboard/GeneratedResumeEditor';
import GeneratedResumePreview from '@/app/components/dashboard/GeneratedResumePreview';
import { useAuth } from '@/app/providers/AuthProvider';
import type { AtsResumeDocument } from '@/app/lib/resume/types';

type WorkspaceMode = 'preview' | 'edit';

type GeneratedResumeWorkspaceModalProps = {
    open: boolean;
    mode: WorkspaceMode;
    onClose: () => void;
    onSaved?: () => void;
};

function cloneDocument(document: AtsResumeDocument): AtsResumeDocument {
    return structuredClone(document);
}

export default function GeneratedResumeWorkspaceModal({
    open,
    mode,
    onClose,
    onSaved,
}: GeneratedResumeWorkspaceModalProps) {
    const { refreshProfile } = useAuth();
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const previousModeRef = useRef<WorkspaceMode>(mode);
    const [document, setDocument] = useState<AtsResumeDocument | null>(null);
    const [draft, setDraft] = useState<AtsResumeDocument | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleDraftChange = useCallback((next: AtsResumeDocument) => {
        setSaveSuccess(false);
        setDraft(next);
    }, []);

    const loadDocument = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSaveSuccess(false);

        try {
            await refreshProfile();

            const response = await fetch('/api/profile/generated-resume', {
                method: 'POST',
                credentials: 'include',
            });

            const payload = (await response.json()) as {
                document?: AtsResumeDocument;
                error?: string;
            };

            if (!response.ok || !payload.document) {
                setError(payload.error ?? 'Não foi possível carregar o currículo.');
                return;
            }

            setDocument(payload.document);
            setDraft(cloneDocument(payload.document));
        } catch {
            setError('Falha de rede ao carregar o currículo.');
        } finally {
            setIsLoading(false);
        }
    }, [refreshProfile]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            previousModeRef.current = mode;
            dialog.showModal();
            void loadDocument();
            return;
        }

        if (!open && dialog.open) {
            dialog.close();
            setSaveSuccess(false);
        }
    }, [loadDocument, open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        previousModeRef.current = mode;
    }, [mode, open]);

    useEffect(() => {
        if (!saveSuccess) {
            return;
        }

        const timeoutId = globalThis.setTimeout(() => {
            setSaveSuccess(false);
        }, 8000);

        return () => globalThis.clearTimeout(timeoutId);
    }, [saveSuccess]);

    async function handleSave() {
        if (!draft) {
            return;
        }

        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);

        try {
            const response = await fetch('/api/profile/generated-resume', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    document: {
                        ...draft,
                        lastUpdatedAt: new Date().toISOString(),
                    },
                }),
            });

            const payload = (await response.json()) as {
                document?: AtsResumeDocument;
                message?: string;
                error?: string;
            };

            if (!response.ok || !payload.document) {
                setError(payload.error ?? 'Não foi possível salvar o currículo.');
                return;
            }

            setDocument(payload.document);
            setDraft(cloneDocument(payload.document));
            setSaveSuccess(true);
            await refreshProfile();
            onSaved?.();
        } catch {
            setError('Falha de rede ao salvar o currículo.');
        } finally {
            setIsSaving(false);
        }
    }

    const title = mode === 'preview' ? 'Pré-visualização do currículo ATS' : 'Editar currículo ATS';
    const subtitle = mode === 'preview'
        ? 'Layout otimizado para leitura de bots (Gupy e outros ATS).'
        : 'Ajuste textos e projetos. Ao salvar, o PDF é atualizado automaticamente.';

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className="fixed left-1/2 top-1/2 m-0 w-[min(96vw,44rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#333] bg-[#1a1a1a] p-5 shadow-2xl backdrop:bg-slate-950/70"
            aria-labelledby="generated-resume-workspace-title"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 id="generated-resume-workspace-title" className="text-sm font-bold text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-xs text-white/60">{subtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#333] text-white/70 hover:text-white/90 hover:border-[#6528d3]/40 transition-colors"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
                        close
                    </span>
                </button>
            </div>

            <div className="mt-4 space-y-3">
                {saveSuccess && (
                    <output
                        className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                        aria-live="polite"
                    >
                        <span
                            className="material-symbols-outlined shrink-0 text-emerald-400"
                            style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                            aria-hidden="true"
                        >
                            check_circle
                        </span>
                        <span>
                            <span className="block font-bold text-emerald-100">Currículo salvo com sucesso</span>
                            <span className="mt-0.5 block text-emerald-200/90">
                                Suas alterações foram salvas e o currículo foi atualizado. Você já pode baixar a versão mais recente.
                            </span>
                        </span>
                    </output>
                )}

                {isLoading && (
                    <div className="rounded-lg border border-[#333] bg-[#111] px-4 py-8 text-center text-sm text-white/60">
                        Carregando currículo...
                    </div>
                )}

                {!isLoading && error && (
                    <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        {error}
                    </div>
                )}

                {!isLoading && !error && draft && mode === 'preview' && (
                    <GeneratedResumePreview document={draft} />
                )}

                {!isLoading && !error && draft && mode === 'edit' && (
                    <GeneratedResumeEditor document={draft} onChange={handleDraftChange} />
                )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                <a
                    href="/api/profile/generated-resume"
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-[#333] text-white/80 hover:text-white hover:border-[#6528d3]/40 transition-colors uppercase tracking-wide"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        download
                    </span>
                    Baixar PDF
                </a>
                {mode === 'edit' && (
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving || !draft}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-[#6528d3] bg-[#6528d3] hover:bg-[#5020b0] text-white transition-colors uppercase tracking-wide disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>
                            save
                        </span>
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                )}
            </div>
        </dialog>
    );
}
