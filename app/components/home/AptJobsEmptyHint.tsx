'use client';

import ClampedHelpTooltip from '@/app/components/ui/ClampedHelpTooltip';

const ARIA_LABEL =
    'Envie seu currículo em PDF ou DOCX para extrair projetos e derivar automaticamente as habilidades do perfil. Currículo sem projetos não funciona mais: a Scudo só contabiliza conhecimento técnico aplicado. Atualize seus projetos com as tecnologias e conceitos que está aprendendo.';

export default function AptJobsEmptyHint() {
    return (
        <div className="flex items-start gap-2">
            <p className="flex-1 text-sm text-slate-400">
                Nenhuma vaga apta no momento. Envie seu currículo para ampliar a compatibilidade.
            </p>
            <ClampedHelpTooltip ariaLabel={ARIA_LABEL} maxWidthPx={22 * 16} tooltipId="apt-jobs-empty-help-tooltip">
                <p className="mb-2">
                    Envie seu currículo (PDF ou DOCX) para extrair projetos e derivar automaticamente as habilidades do
                    perfil.
                </p>
                <p className="text-slate-300/95">
                    Currículo sem projetos não funciona mais. A Scudo só contabiliza conhecimento técnico aplicado.
                    Atualize seus projetos com as tecnologias e conceitos que está aprendendo.
                </p>
            </ClampedHelpTooltip>
        </div>
    );
}
