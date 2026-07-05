'use client';

import type { AtsResumeDocument } from '@/app/lib/resume/types';

type GeneratedResumePreviewProps = {
    document: AtsResumeDocument;
};

function formatHeaderLine(document: AtsResumeDocument) {
    return [
        document.header.city,
        document.header.email,
        document.header.linkedinUrl ? `LinkedIn: ${document.header.linkedinUrl}` : null,
        document.header.githubUrl ? `GitHub: ${document.header.githubUrl}` : null,
    ].filter(Boolean).join(' | ');
}

export default function GeneratedResumePreview({ document }: GeneratedResumePreviewProps) {
    const techGroups = [
        ['Linguagens', document.technologyGroups.languages],
        ['Frontend', document.technologyGroups.frontend],
        ['Backend', document.technologyGroups.backend],
        ['Banco de Dados', document.technologyGroups.database],
        ['Cloud', document.technologyGroups.cloud],
        ['Ferramentas', document.technologyGroups.tools],
        ['Metodologias', document.technologyGroups.methodologies],
    ].filter(([, items]) => items.length > 0) as Array<[string, string[]]>;

    return (
        <article className="rounded-lg border border-[#333] bg-white text-black shadow-inner">
            <div className="max-h-[28rem] overflow-y-auto px-6 py-5 text-[13px] leading-relaxed scrollbar-modern">
                <header className="border-b border-black/10 pb-3">
                    <h3 className="text-lg font-bold tracking-tight">{document.header.fullName}</h3>
                    <p className="mt-1 text-[12px] text-black/70">{formatHeaderLine(document)}</p>
                </header>

                {document.professionalSummary && (
                    <section className="mt-4">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide">Resumo profissional</h4>
                        <p className="mt-1 text-black/85">{document.professionalSummary}</p>
                    </section>
                )}

                {document.experiences.length > 0 && (
                    <section className="mt-4">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide">Experiência profissional</h4>
                        <div className="mt-1 space-y-1 text-black/85">
                            {document.experiences.map((experience, index) => (
                                <p key={`experience-${index}`}>{experience}</p>
                            ))}
                        </div>
                    </section>
                )}

                {document.projects.length > 0 && (
                    <section className="mt-4">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide">Projetos</h4>
                        <div className="mt-2 space-y-3">
                            {document.projects.map((project, index) => (
                                <div key={`project-${index}`}>
                                    <p className="font-semibold">{project.title}</p>
                                    {project.description && (
                                        <p className="mt-0.5 text-black/80">{project.description}</p>
                                    )}
                                    {project.technologies.length > 0 && (
                                        <p className="mt-1 text-[11px] text-black/65">
                                            Tech stacks: {project.technologies.join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {techGroups.length > 0 && (
                    <section className="mt-4">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide">Stacks conhecidas</h4>
                        <div className="mt-1 space-y-1 text-black/80">
                            {techGroups.map(([label, items]) => (
                                <p key={label}>
                                    <span className="font-semibold">{label}:</span> {items.join(', ')}
                                </p>
                            ))}
                        </div>
                    </section>
                )}

                {document.education.length > 0 && (
                    <section className="mt-4">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide">Formação acadêmica</h4>
                        <div className="mt-1 space-y-1 text-black/85">
                            {document.education.map((item, index) => (
                                <p key={`education-${index}`}>{item}</p>
                            ))}
                        </div>
                    </section>
                )}

                {document.certifications.length > 0 && (
                    <section className="mt-4">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide">Certificações</h4>
                        <div className="mt-1 space-y-1 text-black/85">
                            {document.certifications.map((item, index) => (
                                <p key={`certification-${index}`}>{item}</p>
                            ))}
                        </div>
                    </section>
                )}

                {document.languages.length > 0 && (
                    <section className="mt-4">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide">Idiomas</h4>
                        <div className="mt-1 space-y-1 text-black/85">
                            {document.languages.map((item, index) => (
                                <p key={`language-${index}`}>{item}</p>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </article>
    );
}
