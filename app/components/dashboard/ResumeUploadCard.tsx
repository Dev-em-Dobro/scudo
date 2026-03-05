'use client';

import { useState } from 'react';
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

export default function ResumeUploadCard() {
    const { user, isAuthenticated, refreshProfile } = useAuth();
    const [fileName, setFileName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (!isAuthenticated) {
            setMessage('Sua sessão expirou. Faça login novamente para enviar o currículo.');
            return;
        }

        const selectedFile = event.target.files?.[0];
        if (!selectedFile) {
            return;
        }

        if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
            setMessage('Apenas arquivos PDF são aceitos.');
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
            await refreshProfile();
        } catch {
            setMessage('Falha de rede ao enviar currículo.');
        } finally {
            setIsUploading(false);
        }
    }

    let statusLabel = 'Não enviado';
    if (user.resumeSyncStatus === 'ready') {
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
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                            Currículo e Projetos
                        </h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${getSyncBadgeClass(user.resumeSyncStatus)}`}>
                            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "11px", fontVariationSettings: "'FILL' 1" }}>
                                {getSyncIcon(user.resumeSyncStatus)}
                            </span>
                            {statusLabel}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Envie seu currículo para extrair projetos e derivar automaticamente as skills do perfil.
                    </p>

                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <label className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-primary/30 text-primary bg-primary/5 cursor-pointer hover:bg-primary/10 active:scale-95 transition-all duration-150 uppercase tracking-wide ${(isUploading || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}>
                            <span className="material-symbols-outlined" style={{ fontSize: "15px", fontVariationSettings: "'FILL' 1" }}>upload_file</span>
                            <span>{isUploading ? 'Processando...' : 'Upload PDF'}</span>
                            <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                disabled={isUploading || !isAuthenticated}
                                onChange={handleFileChange}
                            />
                        </label>
                        {fileName && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-48">
                                {fileName}
                            </span>
                        )}
                    </div>

                    {message && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{message}</p>
                    )}
                    {!isAuthenticated && (
                        <p className="mt-2 text-xs text-amber-400">Faça login para habilitar o upload de currículo.</p>
                    )}

                    {user.knownTechnologies.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {user.knownTechnologies.map((technology) => (
                                <span
                                    key={technology}
                                    className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-md"
                                >
                                    {technology}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
