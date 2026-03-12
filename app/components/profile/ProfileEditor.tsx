'use client';

import { useMemo, useState } from 'react';

import type { UserProject } from '@/app/types';

type EditableProfile = {
    fullName: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    city: string | null;
    professionalSummary: string | null;
    experiences: string[];
    knownTechnologies: string[];
    projects: UserProject[];
    certifications: string[];
    languages: string[];
};

type EditableProjectForm = {
    localId: string;
    title: string;
    shortDescription: string;
    technologiesText: string;
    deployUrl: string;
};

interface ProfileEditorProps {
    readonly initialProfile: EditableProfile;
}

function toTextAreaValue(values: string[]) {
    return values.join('\n');
}

function fromTextAreaValue(value: string) {
    return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
}

function createProjectLocalId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toProjectForm(project: UserProject): EditableProjectForm {
    return {
        localId: project.id,
        title: project.title,
        shortDescription: project.shortDescription ?? '',
        technologiesText: project.technologies.join(', '),
        deployUrl: project.deployUrl ?? '',
    };
}

function parseProjectTechnologies(value: string) {
    return [...new Set(value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean))];
}

function deriveKnownTechnologiesFromProjects(projects: { technologies: string[] }[]) {
    return [...new Set(projects
        .flatMap((project) => project.technologies)
        .map((technology) => technology.trim().toLowerCase())
        .filter(Boolean))];
}

export default function ProfileEditor({ initialProfile }: Readonly<ProfileEditorProps>) {
    const [fullName, setFullName] = useState(initialProfile.fullName ?? '');
    const [linkedinUrl, setLinkedinUrl] = useState(initialProfile.linkedinUrl ?? '');
    const [githubUrl, setGithubUrl] = useState(initialProfile.githubUrl ?? '');
    const [city, setCity] = useState(initialProfile.city ?? '');
    const [professionalSummary, setProfessionalSummary] = useState(initialProfile.professionalSummary ?? '');

    const [experiencesText, setExperiencesText] = useState(toTextAreaValue(initialProfile.experiences));
    const [projects, setProjects] = useState<EditableProjectForm[]>(initialProfile.projects.map(toProjectForm));
    const [certificationsText, setCertificationsText] = useState(toTextAreaValue(initialProfile.certifications));
    const [languagesText, setLanguagesText] = useState(toTextAreaValue(initialProfile.languages));

    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const parsedPreview = useMemo(() => {
        const parsedProjects = projects
            .map((project) => {
                const title = project.title.trim();
                if (!title) {
                    return null;
                }

                return {
                    title,
                    shortDescription: project.shortDescription.trim() || null,
                    technologies: parseProjectTechnologies(project.technologiesText),
                    deployUrl: project.deployUrl.trim() || null,
                };
            })
            .filter((project): project is {
                title: string;
                shortDescription: string | null;
                technologies: string[];
                deployUrl: string | null;
            } => project !== null);

        return {
            experiences: fromTextAreaValue(experiencesText),
            projects: parsedProjects,
            knownTechnologies: deriveKnownTechnologiesFromProjects(parsedProjects),
            certifications: fromTextAreaValue(certificationsText),
            languages: fromTextAreaValue(languagesText),
        };
    }, [certificationsText, experiencesText, languagesText, projects]);

    function updateProject(localId: string, changes: Partial<EditableProjectForm>) {
        setProjects((current) => current.map((project) => (project.localId === localId ? { ...project, ...changes } : project)));
    }

    function removeProject(localId: string) {
        setProjects((current) => current.filter((project) => project.localId !== localId));
    }

    function addProject() {
        setProjects((current) => [...current, {
            localId: createProjectLocalId(),
            title: '',
            shortDescription: '',
            technologiesText: '',
            deployUrl: '',
        }]);
    }

    async function handleSubmit(event: { preventDefault: () => void }) {
        event.preventDefault();
        setIsSaving(true);
        setFeedback(null);

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName,
                    linkedinUrl,
                    githubUrl,
                    city,
                    professionalSummary,
                    experiences: parsedPreview.experiences,
                    projects: parsedPreview.projects,
                    certifications: parsedPreview.certifications,
                    languages: parsedPreview.languages,
                }),
            });

            const payload = (await response.json()) as { message?: string; error?: string };

            if (!response.ok) {
                setFeedback(payload.error ?? 'Não foi possível salvar o perfil.');
                return;
            }

            setFeedback(payload.message ?? 'Perfil atualizado com sucesso.');
        } catch {
            setFeedback('Falha de rede ao salvar o perfil.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-5 shadow-sm rounded-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Editar Perfil
            </h2>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2">
                        <span>Nome</span>
                        <input
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                            value={fullName}
                            maxLength={120}
                            onChange={(event) => setFullName(event.target.value)}
                        />
                    </label>

                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2">
                        <span>Cidade</span>
                        <input
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                            value={city}
                            maxLength={100}
                            onChange={(event) => setCity(event.target.value)}
                        />
                    </label>

                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2">
                        <span>LinkedIn</span>
                        <input
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                            value={linkedinUrl}
                            maxLength={500}
                            onChange={(event) => setLinkedinUrl(event.target.value)}
                        />
                    </label>

                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2">
                        <span>GitHub</span>
                        <input
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                            value={githubUrl}
                            maxLength={500}
                            onChange={(event) => setGithubUrl(event.target.value)}
                        />
                    </label>
                </div>

                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                    <span>Resumo Profissional</span>
                    <textarea
                        className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                        value={professionalSummary}
                        maxLength={3000}
                        onChange={(event) => setProfessionalSummary(event.target.value)}
                    />
                </label>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                        <span>Experiências (uma por linha)</span>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                            value={experiencesText}
                            onChange={(event) => setExperiencesText(event.target.value)}
                        />
                    </label>

                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                        <span>Certificações (uma por linha)</span>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                            value={certificationsText}
                            onChange={(event) => setCertificationsText(event.target.value)}
                        />
                    </label>

                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                        <span>Idiomas (uma por linha)</span>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                            value={languagesText}
                            onChange={(event) => setLanguagesText(event.target.value)}
                        />
                    </label>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Projetos</p>
                        <button
                            type="button"
                            onClick={addProject}
                            className="px-3 py-2 text-xs font-bold rounded border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors uppercase"
                        >
                            Adicionar Projeto
                        </button>
                    </div>

                    {projects.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Nenhum projeto cadastrado. Adicione projetos para derivar suas skills automaticamente.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {projects.map((project, index) => (
                                <article
                                    key={project.localId}
                                    className="border border-border-light dark:border-border-dark rounded-lg p-3 space-y-3 bg-white dark:bg-surface-dark"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                                            Projeto {index + 1}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => removeProject(project.localId)}
                                            className="text-xs font-bold uppercase text-red-600 dark:text-red-400"
                                        >
                                            Remover
                                        </button>
                                    </div>

                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                                        <span>Título</span>
                                        <input
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                            value={project.title}
                                            onChange={(event) => updateProject(project.localId, { title: event.target.value })}
                                        />
                                    </label>

                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                                        <span>Descrição breve</span>
                                        <textarea
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-20"
                                            value={project.shortDescription}
                                            onChange={(event) => updateProject(project.localId, { shortDescription: event.target.value })}
                                        />
                                    </label>

                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                                        <span>Tecnologias (separadas por vírgula)</span>
                                        <textarea
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-20"
                                            value={project.technologiesText}
                                            onChange={(event) => updateProject(project.localId, { technologiesText: event.target.value })}
                                        />
                                    </label>

                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 space-y-2 block">
                                        <span>Link de deploy (opcional)</span>
                                        <input
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                            value={project.deployUrl}
                                            onChange={(event) => updateProject(project.localId, { deployUrl: event.target.value })}
                                        />
                                    </label>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Itens atuais: {parsedPreview.knownTechnologies.length} skills derivadas de {parsedPreview.projects.length} projetos e {parsedPreview.experiences.length} experiências
                    </p>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-bold rounded border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors uppercase disabled:opacity-60"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Perfil'}
                    </button>
                </div>

                {feedback && (
                    <p role="alert" className="text-xs text-slate-600 dark:text-slate-300">
                        {feedback}
                    </p>
                )}
            </form>
        </section>
    );
}
