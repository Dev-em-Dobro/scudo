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
                    <h2 className="text-sm font-bold text-white">
                        Modelo de Currículo
                    </h2>
                    <p className="text-sm text-slate-400 dark:text-slate-300 mt-1">
                        Não tem um currículo pronto? Use nosso modelo em PDF como base e facilite o upload.
                    </p>
                    <div className="mt-3">
                        <a
                            href="/api/profile/resume/example"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-primary bg-primary hover:bg-primary/90 text-white active:scale-95 transition-all duration-150 uppercase tracking-wide"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: "15px", fontVariationSettings: "'FILL' 1" }} aria-hidden="true">download</span>
                            <span>Baixar Exemplo</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
