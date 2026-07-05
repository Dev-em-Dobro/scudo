'use client';

import type { AtsResumeDocument } from '@/app/lib/resume/types';
import {
    joinCommaSeparatedList,
    joinLineSeparatedList,
    parseCommaSeparatedList,
    parseLineSeparatedList,
} from '@/app/lib/resume/documentUtils';

type GeneratedResumeEditorProps = {
    document: AtsResumeDocument;
    onChange: (document: AtsResumeDocument) => void;
};

function fieldClassName() {
    return 'w-full bg-transparent border-0 border-b border-transparent focus:border-[#6528d3]/40 focus:outline-none focus:ring-0 px-0 py-0.5 text-[13px] leading-relaxed text-black placeholder:text-black/35';
}

function textareaClassName() {
    return `${fieldClassName()} resize-y min-h-[4.5rem]`;
}

export default function GeneratedResumeEditor({ document, onChange }: GeneratedResumeEditorProps) {
    function updateDocument(patch: Partial<AtsResumeDocument>) {
        onChange({ ...document, ...patch });
    }

    function updateHeader(field: keyof AtsResumeDocument['header'], value: string) {
        onChange({
            ...document,
            header: {
                ...document.header,
                [field]: value.trim() ? value : field === 'email' ? document.header.email : null,
            },
        });
    }

    function updateProject(index: number, patch: Partial<AtsResumeDocument['projects'][number]>) {
        const projects = document.projects.map((project, projectIndex) => (
            projectIndex === index ? { ...project, ...patch } : project
        ));
        updateDocument({ projects });
    }

    return (
        <article className="rounded-lg border border-[#333] bg-white text-black shadow-inner">
            <div className="max-h-[32rem] overflow-y-auto px-6 py-5 text-[13px] leading-relaxed scrollbar-modern">
                <header className="border-b border-black/10 pb-3 space-y-2">
                    <input
                        type="text"
                        value={document.header.fullName}
                        onChange={(event) => updateHeader('fullName', event.target.value)}
                        className={`${fieldClassName()} text-lg font-bold`}
                        placeholder="Seu nome completo"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                            type="text"
                            value={document.header.city ?? ''}
                            onChange={(event) => updateHeader('city', event.target.value)}
                            className={fieldClassName()}
                            placeholder="Cidade"
                        />
                        <input
                            type="email"
                            value={document.header.email}
                            readOnly
                            className={`${fieldClassName()} text-black/60`}
                            aria-label="E-mail (somente leitura)"
                        />
                        <input
                            type="text"
                            value={document.header.linkedinUrl ?? ''}
                            onChange={(event) => updateHeader('linkedinUrl', event.target.value)}
                            className={fieldClassName()}
                            placeholder="linkedin.com/in/seu-perfil"
                        />
                        <input
                            type="text"
                            value={document.header.githubUrl ?? ''}
                            onChange={(event) => updateHeader('githubUrl', event.target.value)}
                            className={fieldClassName()}
                            placeholder="github.com/seu-usuario"
                        />
                    </div>
                </header>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Resumo profissional</h4>
                    <textarea
                        value={document.professionalSummary ?? ''}
                        onChange={(event) => updateDocument({ professionalSummary: event.target.value })}
                        className={`${textareaClassName()} mt-1`}
                        placeholder="Descreva sua experiência, foco técnico e objetivo profissional."
                    />
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Experiência profissional</h4>
                    <p className="mt-1 text-[11px] text-black/50">Uma linha por experiência.</p>
                    <textarea
                        value={joinLineSeparatedList(document.experiences)}
                        onChange={(event) => updateDocument({ experiences: parseLineSeparatedList(event.target.value) })}
                        className={`${textareaClassName()} mt-1`}
                        placeholder="Cargo — Empresa — Período — Principais resultados"
                    />
                </section>

                <section className="mt-4">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Projetos</h4>
                        <span className="text-[11px] text-black/45">{document.projects.length} projeto(s)</span>
                    </div>
                    <div className="mt-2 space-y-4">
                        {document.projects.map((project, index) => (
                            <div key={`project-${index}`} className="rounded-md border border-black/10 p-3 space-y-2">
                                <input
                                    type="text"
                                    value={project.title}
                                    onChange={(event) => updateProject(index, { title: event.target.value })}
                                    className={`${fieldClassName()} font-semibold`}
                                    placeholder="Título do projeto"
                                />
                                <textarea
                                    value={project.description}
                                    onChange={(event) => updateProject(index, { description: event.target.value })}
                                    className={textareaClassName()}
                                    placeholder="Descrição com impacto, aprendizados e contexto do projeto."
                                />
                                <input
                                    type="text"
                                    value={joinCommaSeparatedList(project.technologies)}
                                    onChange={(event) => updateProject(index, {
                                        technologies: parseCommaSeparatedList(event.target.value),
                                    })}
                                    className={fieldClassName()}
                                    placeholder="React, TypeScript, Node.js"
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Formação acadêmica</h4>
                    <textarea
                        value={joinLineSeparatedList(document.education)}
                        onChange={(event) => updateDocument({ education: parseLineSeparatedList(event.target.value) })}
                        className={`${textareaClassName()} mt-1`}
                    />
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Certificações</h4>
                    <textarea
                        value={joinLineSeparatedList(document.certifications)}
                        onChange={(event) => updateDocument({ certifications: parseLineSeparatedList(event.target.value) })}
                        className={`${textareaClassName()} mt-1`}
                    />
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Idiomas</h4>
                    <textarea
                        value={joinLineSeparatedList(document.languages)}
                        onChange={(event) => updateDocument({ languages: parseLineSeparatedList(event.target.value) })}
                        className={`${textareaClassName()} mt-1`}
                        placeholder="Português — Nativo"
                    />
                </section>

                <p className="mt-4 text-[11px] text-black/45">
                    As stacks são reorganizadas automaticamente ao salvar, com base nas tecnologias dos projetos.
                </p>
            </div>
        </article>
    );
}
