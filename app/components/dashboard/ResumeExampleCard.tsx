'use client';

export default function ResumeExampleCard() {
    return (
        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 hover:border-primary/30 dark:hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
                    >
                        description
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold shrink-0">1</span>
                        <h2 className="text-sm font-bold text-white">
                            Baixe o modelo de currículo
                        </h2>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-300 mt-1">
                        Use nosso modelo para preencher e garantir que a leitura automática funcione corretamente. Currículos com formatação complexa podem não ser lidos.
                    </p>
                    <div className="mt-3">
                        <a
                            href="/api/profile/resume/example"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-primary bg-primary hover:bg-primary/90 text-white active:scale-95 transition-all duration-150 uppercase tracking-wide"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: "15px", fontVariationSettings: "'FILL' 1" }} aria-hidden="true">download</span>
                            <span>Baixar Modelo</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
