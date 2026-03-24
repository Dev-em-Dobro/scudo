'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';

function getSyncBadgeClass(status: string) {
    if (status === 'ready') return 'bg-primary/10 text-primary border-primary/30';
    if (status === 'processing' || status === 'uploaded') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
}

function getSyncIcon(status: string) {
    if (status === 'ready') return 'check_circle';
    if (status === 'processing') return 'sync';
    return 'radio_button_unchecked';
}

function isSupportedResumeFile(fileName: string) {
    const normalizedName = fileName.toLowerCase();
    return normalizedName.endsWith('.pdf') || normalizedName.endsWith('.docx');
}

export default function ResumeUploadCard() {
    const { user, isAuthenticated, isPending, refreshProfile } = useAuth();
    const [fileName, setFileName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [hasUploadedInSession, setHasUploadedInSession] = useState(false);
    const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
    const readyDialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        if (hasUploadedInSession && user.resumeSyncStatus === 'ready') {
            setIsReadyModalOpen(true);
            setHasUploadedInSession(false);
        }
    }, [hasUploadedInSession, user.resumeSyncStatus]);

    useEffect(() => {
        const dialog = readyDialogRef.current;
        if (!dialog) {
            return;
        }

        if (isReadyModalOpen && !dialog.open) {
            dialog.showModal();
            return;
        }

        if (!isReadyModalOpen && dialog.open) {
            dialog.close();
        }
    }, [isReadyModalOpen]);

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (!isAuthenticated) {
            setMessage('Sua sessão expirou. Faça login novamente para enviar o currículo.');
            return;
        }

        const selectedFile = event.target.files?.[0];
        if (!selectedFile) {
            return;
        }

        if (!isSupportedResumeFile(selectedFile.name)) {
            setMessage('Apenas arquivos PDF ou DOCX são aceitos.');
            return;
        }

        setIsUploading(true);
        setMessage(null);

        try {
            const body = new FormData();
            body.append('file', selectedFile);

            const response = await fetch('/api/profile/resume', {
                method: 'POST',
                body,
                credentials: 'include',
            });

            const payload = (await response.json()) as { message?: string; error?: string };

            if (response.status === 401) {
                setMessage('Sessão inválida ou expirada. Entre novamente para continuar.');
                return;
            }

            if (!response.ok) {
                setMessage(payload.error ?? 'Falha ao processar currículo.');
                return;
            }

            setFileName(selectedFile.name);
            setMessage(payload.message ?? 'Currículo enviado e processado com sucesso.');
            setHasUploadedInSession(true);
            await refreshProfile();
        } catch {
            setMessage('Falha de rede ao enviar currículo.');
        } finally {
            setIsUploading(false);
        }
    }

    const isLoadingResumeState = isAuthenticated && isPending && user.resumeSyncStatus === 'not_uploaded';
    const requiresManualReview = user.resumeSyncStatus === 'uploaded';
    const displayedFileName = fileName ?? user.resumeFileName;

    let statusLabel = 'Não enviado';
    if (isLoadingResumeState) {
        statusLabel = 'Carregando';
    } else if (user.resumeSyncStatus === 'ready') {
        statusLabel = 'Sincronizado';
    } else if (user.resumeSyncStatus === 'processing') {
        statusLabel = 'Processando';
    } else if (user.resumeSyncStatus === 'uploaded') {
        statusLabel = 'Enviado';
    }

    return (
        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 hover:border-primary/30 dark:hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
                    >
                        upload_file
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-white">
                            Currículo e Projetos
                        </h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${getSyncBadgeClass(isLoadingResumeState ? 'processing' : user.resumeSyncStatus)}`}>
                            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "11px", fontVariationSettings: "'FILL' 1" }}>
                                {getSyncIcon(isLoadingResumeState ? 'processing' : user.resumeSyncStatus)}
                            </span>
                            {statusLabel}
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-300 mt-1">
                        Envie seu currículo (PDF ou DOCX) para extrair projetos e derivar automaticamente as skills do perfil.
                    </p>

                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <label className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-primary/30 text-primary bg-primary/5 cursor-pointer hover:bg-primary/10 active:scale-95 transition-all duration-150 uppercase tracking-wide ${(isUploading || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}>
                            <span className="material-symbols-outlined" style={{ fontSize: "15px", fontVariationSettings: "'FILL' 1" }}>upload_file</span>
                            <span>{isUploading ? 'Processando...' : 'Upload PDF/DOCX'}</span>
                            <input
                                type="file"
                                accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                disabled={isUploading || !isAuthenticated}
                                onChange={handleFileChange}
                            />
                        </label>
                        {displayedFileName && (
                            <span className="text-xs text-slate-400 dark:text-slate-300 truncate max-w-48">
                                {displayedFileName}
                            </span>
                        )}
                    </div>

                    {message && (
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-300">{message}</p>
                    )}

                    {requiresManualReview && (
                        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-amber-300" style={{ fontSize: '16px' }} aria-hidden="true">
                                    warning
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                                        Revisão manual necessária
                                    </p>
                                    <p className="mt-1 text-xs text-amber-100/90">
                                        Seu arquivo foi recebido e salvo, mas a leitura automática não conseguiu preencher os dados do perfil com confiança.
                                    </p>
                                    <Link
                                        href="/perfil"
                                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-200 hover:text-amber-100 transition-colors"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">
                                            edit_square
                                        </span>
                                        <span>Revisar dados manualmente no perfil</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isAuthenticated && (
                        <p className="mt-2 text-xs text-amber-400">Faça login para habilitar o upload de currículo.</p>
                    )}

                    {user.knownTechnologies.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {user.knownTechnologies.map((technology) => (
                                <span
                                    key={technology}
                                    className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-md"
                                >
                                    {technology}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <dialog
                ref={readyDialogRef}
                onClose={() => setIsReadyModalOpen(false)}
                className="fixed left-1/2 top-1/2 m-0 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-5 shadow-2xl backdrop:bg-slate-950/70"
                aria-labelledby="resume-ready-modal-title"
            >
                <div>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                                check_circle
                            </span>
                            <div>
                                <h3 id="resume-ready-modal-title" className="text-sm font-bold text-white">
                                    Currículo sincronizado
                                </h3>
                                <p className="mt-1 text-sm text-slate-400 dark:text-slate-300">
                                    Os dados do seu currículo foram processados. Revise no perfil para garantir que tudo está correto.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsReadyModalOpen(false)}
                            aria-label="Fechar aviso"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-light dark:border-border-dark text-slate-400 hover:text-slate-200 hover:border-primary/40 transition-colors"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
                                close
                            </span>
                        </button>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsReadyModalOpen(false)}
                            className="inline-flex items-center px-3 py-2 text-xs font-bold rounded-lg border border-border-light dark:border-border-dark text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wide"
                        >
                            Depois
                        </button>
                        <Link
                            href="/perfil"
                            onClick={() => setIsReadyModalOpen(false)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors uppercase tracking-wide"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                                edit_square
                            </span>
                            <span>Revisar no perfil</span>
                        </Link>
                    </div>
                </div>
            </dialog>
        </div>
    );
}
