'use client';

import { useLayoutEffect, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';

import type { AtsResumeDocument } from '@/app/lib/resume/types';
import {
    joinCommaSeparatedList,
    joinLineSeparatedList,
    parseCommaSeparatedList,
    parseLineSeparatedList,
} from '@/app/lib/resume/documentUtils';

type GeneratedResumeEditorProps = {
    readonly document: AtsResumeDocument;
    readonly onChange: (document: AtsResumeDocument) => void;
};

type AutoResizeTextareaProps = {
    readonly value: string;
    readonly onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    readonly className?: string;
    readonly placeholder?: string;
};

function textareaClassName() {
    return 'w-full bg-transparent border-0 border-b border-transparent focus:border-[#6528d3]/40 focus:outline-none focus:ring-0 px-0 py-0.5 text-[13px] leading-relaxed text-black placeholder:text-black/35 resize-none overflow-hidden min-h-[4.5rem]';
}

function AutoResizeTextarea({ value, onChange, className, placeholder }: AutoResizeTextareaProps) {
    const ref = useRef<HTMLTextAreaElement | null>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
    }, [value]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            className={className}
            placeholder={placeholder}
            rows={1}
        />
    );
}

function formatHeaderLine(document: AtsResumeDocument) {
    return [
        document.header.city,
        document.header.email,
        document.header.linkedinUrl ? `LinkedIn: ${document.header.linkedinUrl}` : null,
        document.header.githubUrl ? `GitHub: ${document.header.githubUrl}` : null,
    ].filter(Boolean).join(' | ');
}

export default function GeneratedResumeEditor({ document, onChange }: GeneratedResumeEditorProps) {
    function updateDocument(patch: Partial<AtsResumeDocument>) {
        onChange({ ...document, ...patch });
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
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">{document.header.fullName}</h3>
                            <p className="mt-1 text-[12px] text-black/70">{formatHeaderLine(document)}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-black/10 bg-black/[0.03] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/45">
                            Do perfil
                        </span>
                    </div>
                    <p className="text-[11px] text-black/50">
                        Nome, cidade e links vêm do{' '}
                        <Link href="/perfil" className="font-semibold text-[#6528d3] hover:underline">
                            Meu Perfil
                        </Link>
                        . Salve lá para atualizar o cabeçalho do currículo.
                    </p>
                </header>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Resumo profissional</h4>
                    <AutoResizeTextarea
                        value={document.professionalSummary ?? ''}
                        onChange={(event) => updateDocument({ professionalSummary: event.target.value })}
                        className={`${textareaClassName()} mt-1`}
                        placeholder="Descreva sua experiência, foco técnico e objetivo profissional."
                    />
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Experiência profissional</h4>
                    <p className="mt-1 text-[11px] text-black/50">Uma linha por experiência.</p>
                    <AutoResizeTextarea
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
                    <p className="mt-1 text-[11px] text-black/50">
                        Projetos do curso são adicionados ao concluir ranks. Ajuste aqui títulos, descrições e stacks.
                    </p>
                    <div className="mt-2 space-y-4">
                        {document.projects.map((project, index) => (
                            <div key={`project-${index}`} className="rounded-md border border-black/10 p-3 space-y-2">
                                <input
                                    type="text"
                                    value={project.title}
                                    onChange={(event) => updateProject(index, { title: event.target.value })}
                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#6528d3]/40 focus:outline-none focus:ring-0 px-0 py-0.5 text-[13px] font-semibold text-black"
                                    placeholder="Título do projeto"
                                />
                                <AutoResizeTextarea
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
                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#6528d3]/40 focus:outline-none focus:ring-0 px-0 py-0.5 text-[13px] text-black"
                                    placeholder="React, TypeScript, Node.js"
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Formação acadêmica</h4>
                    <AutoResizeTextarea
                        value={joinLineSeparatedList(document.education)}
                        onChange={(event) => updateDocument({ education: parseLineSeparatedList(event.target.value) })}
                        className={`${textareaClassName()} mt-1`}
                    />
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Certificações</h4>
                    <AutoResizeTextarea
                        value={joinLineSeparatedList(document.certifications)}
                        onChange={(event) => updateDocument({ certifications: parseLineSeparatedList(event.target.value) })}
                        className={`${textareaClassName()} mt-1`}
                    />
                </section>

                <section className="mt-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-black/70">Idiomas</h4>
                    <AutoResizeTextarea
                        value={joinLineSeparatedList(document.languages)}
                        onChange={(event) => updateDocument({ languages: parseLineSeparatedList(event.target.value) })}
                        className={`${textareaClassName()} mt-1`}
                        placeholder="Português — Nativo"
                    />
                </section>

                <p className="mt-4 text-[11px] text-black/45">
                    Ao salvar, o texto do currículo é espelhado no seu perfil para o matching de vagas. As stacks são reorganizadas automaticamente.
                </p>
            </div>
        </article>
    );
}
