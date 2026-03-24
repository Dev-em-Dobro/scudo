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
    softSkills: string[];
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

type NewProjectDraft = {
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

function normalizeSkillList(value: string) {
    return [...new Set(value
        .split(/[\n,]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean))];
}

function createEmptyNewProjectDraft(): NewProjectDraft {
    return {
        title: '',
        shortDescription: '',
        technologiesText: '',
        deployUrl: '',
    };
}

function toEditableProject(project: EditableProjectForm) {
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
}

function PersonalDataRow({ icon, label, value }: Readonly<{ icon: string; label: string; value: string | null }>) {
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-border-light dark:border-border-dark last:border-0">
            <span
                className="shrink-0 material-symbols-outlined text-slate-200"
                style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
            >
                {icon}
            </span>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide w-24 shrink-0">
                {label}
            </span>
            {value ? (
                <span className="text-sm text-slate-100 truncate">{value}</span>
            ) : (
                <span className="text-sm text-slate-300 italic">Não informado</span>
            )}
        </div>
    );
}

function SectionBlock({
    title,
    icon,
    iconColor,
    children,
}: Readonly<{ title: string; icon: string; iconColor: string; children: React.ReactNode }>) {
    return (
        <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <span
                    className={`material-symbols-outlined ${iconColor}`}
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                >
                    {icon}
                </span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function TagList({ values, emptyLabel }: Readonly<{ values: string[]; emptyLabel: string }>) {
    if (values.length === 0) {
        return <p className="text-sm text-slate-200">{emptyLabel}</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {values.map((value) => (
                <span
                    key={value}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-mono font-medium text-slate-100 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg"
                >
                    {value}
                </span>
            ))}
        </div>
    );
}

function ProjectCard({ project }: Readonly<{ project: UserProject }>) {
    return (
        <article className="border border-border-light dark:border-border-dark rounded-xl p-4 bg-slate-50 dark:bg-background-dark space-y-3 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-white">{project.title}</p>
                {project.deployUrl ? (
                    <a
                        href={project.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}
                        >
                            open_in_new
                        </span>
                        {' '}Deploy
                    </a>
                ) : (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-200 border border-border-dark rounded-lg">
                        Sem deploy
                    </span>
                )}
            </div>

            {project.shortDescription ? (
                <p className="text-xs text-slate-100 leading-relaxed">{project.shortDescription}</p>
            ) : null}

            {project.technologies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {project.technologies.map((tech) => (
                        <span
                            key={`${project.id}-${tech}`}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium text-slate-100 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded"
                        >
                            {tech}
                        </span>
                    ))}
                </div>
            ) : null}
        </article>
    );
}

function mapDraftProjectsToProfileProjects(projects: EditableProjectForm[]): EditableProfile['projects'] {
    const mapped: EditableProfile['projects'] = [];

    for (const project of projects) {
        const editable = toEditableProject(project);
        if (!editable) {
            continue;
        }

        mapped.push({
            id: project.localId,
            title: editable.title,
            shortDescription: editable.shortDescription,
            technologies: editable.technologies,
            deployUrl: editable.deployUrl,
        });
    }

    return mapped;
}

export default function ProfileEditor({ initialProfile }: Readonly<ProfileEditorProps>) {
    const [profileSnapshot, setProfileSnapshot] = useState(initialProfile);
    const [isEditing, setIsEditing] = useState(false);

    const [fullName, setFullName] = useState(profileSnapshot.fullName ?? '');
    const [linkedinUrl, setLinkedinUrl] = useState(profileSnapshot.linkedinUrl ?? '');
    const [githubUrl, setGithubUrl] = useState(profileSnapshot.githubUrl ?? '');
    const [city, setCity] = useState(profileSnapshot.city ?? '');
    const [professionalSummary, setProfessionalSummary] = useState(profileSnapshot.professionalSummary ?? '');

    const [experiencesText, setExperiencesText] = useState(toTextAreaValue(profileSnapshot.experiences));
    const [knownTechnologiesText, setKnownTechnologiesText] = useState(toTextAreaValue(profileSnapshot.knownTechnologies));
    const [softSkillsText, setSoftSkillsText] = useState(toTextAreaValue(profileSnapshot.softSkills));
    const [projects, setProjects] = useState<EditableProjectForm[]>(profileSnapshot.projects.map(toProjectForm));
    const [newProjectDraft, setNewProjectDraft] = useState<NewProjectDraft>(createEmptyNewProjectDraft());
    const [certificationsText, setCertificationsText] = useState(toTextAreaValue(profileSnapshot.certifications));
    const [languagesText, setLanguagesText] = useState(toTextAreaValue(profileSnapshot.languages));

    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const parsedPreview = useMemo(() => {
        const parsedProjects = projects
            .map((project) => toEditableProject(project))
            .filter((project): project is {
                title: string;
                shortDescription: string | null;
                technologies: string[];
                deployUrl: string | null;
            } => project !== null);

        const manualKnownTechnologies = normalizeSkillList(knownTechnologiesText);
        const derivedKnownTechnologies = deriveKnownTechnologiesFromProjects(parsedProjects);
        const knownTechnologies = [...new Set([...manualKnownTechnologies, ...derivedKnownTechnologies])];

        return {
            experiences: fromTextAreaValue(experiencesText),
            projects: parsedProjects,
            knownTechnologies,
            softSkills: normalizeSkillList(softSkillsText),
            certifications: fromTextAreaValue(certificationsText),
            languages: fromTextAreaValue(languagesText),
        };
    }, [certificationsText, experiencesText, knownTechnologiesText, languagesText, projects, softSkillsText]);

    const previewProfile: EditableProfile = {
        fullName: fullName.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        githubUrl: githubUrl.trim() || null,
        city: city.trim() || null,
        professionalSummary: professionalSummary.trim() || null,
        experiences: parsedPreview.experiences,
        knownTechnologies: parsedPreview.knownTechnologies,
        softSkills: parsedPreview.softSkills,
        projects: mapDraftProjectsToProfileProjects(projects),
        certifications: parsedPreview.certifications,
        languages: parsedPreview.languages,
    };

    function syncDraftFromProfile(profile: EditableProfile) {
        setFullName(profile.fullName ?? '');
        setLinkedinUrl(profile.linkedinUrl ?? '');
        setGithubUrl(profile.githubUrl ?? '');
        setCity(profile.city ?? '');
        setProfessionalSummary(profile.professionalSummary ?? '');
        setExperiencesText(toTextAreaValue(profile.experiences));
        setKnownTechnologiesText(toTextAreaValue(profile.knownTechnologies));
        setSoftSkillsText(toTextAreaValue(profile.softSkills));
        setProjects(profile.projects.map(toProjectForm));
        setNewProjectDraft(createEmptyNewProjectDraft());
        setCertificationsText(toTextAreaValue(profile.certifications));
        setLanguagesText(toTextAreaValue(profile.languages));
    }

    function updateProject(localId: string, changes: Partial<EditableProjectForm>) {
        setProjects((current) => current.map((project) => (project.localId === localId ? { ...project, ...changes } : project)));
    }

    function removeProject(localId: string) {
        setProjects((current) => current.filter((project) => project.localId !== localId));
    }

    function addProject(projectDraft: NewProjectDraft) {
        setProjects((current) => [...current, {
            localId: createProjectLocalId(),
            title: projectDraft.title,
            shortDescription: projectDraft.shortDescription,
            technologiesText: projectDraft.technologiesText,
            deployUrl: projectDraft.deployUrl,
        }]);
    }

    function handleSaveNewProject() {
        const title = newProjectDraft.title.trim();
        if (!title) {
            setFeedback('Informe o título do projeto antes de salvar.');
            return;
        }

        addProject({
            ...newProjectDraft,
            title,
        });
        setNewProjectDraft(createEmptyNewProjectDraft());
        setFeedback('Novo projeto adicionado à lista de edição.');
    }

    function handleOpenEditor() {
        syncDraftFromProfile(profileSnapshot);
        setFeedback(null);
        setIsEditing(true);
    }

    function handleCancelEdit() {
        syncDraftFromProfile(profileSnapshot);
        setFeedback(null);
        setIsEditing(false);
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
                    knownTechnologies: parsedPreview.knownTechnologies,
                    softSkills: parsedPreview.softSkills,
                    projects: parsedPreview.projects,
                    certifications: parsedPreview.certifications,
                    languages: parsedPreview.languages,
                }),
            });

            const payload = (await response.json()) as {
                message?: string;
                error?: string;
                profile?: EditableProfile;
            };

            if (!response.ok) {
                setFeedback(payload.error ?? 'Não foi possível salvar o perfil.');
                return;
            }

            const normalizedProfile = payload.profile ?? previewProfile;
            setProfileSnapshot(normalizedProfile);
            syncDraftFromProfile(normalizedProfile);
            setIsEditing(false);
            setFeedback(payload.message ?? 'Perfil atualizado com sucesso.');
        } catch {
            setFeedback('Falha de rede ao salvar o perfil.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Perfil</h2>
                {isEditing ? (
                    <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="cursor-pointer px-4 py-2 text-xs font-bold rounded border border-border-light dark:border-border-dark text-slate-100 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-colors uppercase"
                    >
                        Cancelar Edição
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleOpenEditor}
                        className="cursor-pointer px-4 py-2 text-xs font-bold rounded border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors uppercase"
                    >
                        Editar Perfil
                    </button>
                )}
            </div>

            <SectionBlock title="Dados Pessoais" icon="person" iconColor="text-primary">
                <PersonalDataRow icon="badge" label="Nome" value={profileSnapshot.fullName} />
                <PersonalDataRow icon="location_on" label="Cidade" value={profileSnapshot.city} />
                <PersonalDataRow icon="work" label="LinkedIn" value={profileSnapshot.linkedinUrl} />
                <PersonalDataRow icon="code" label="GitHub" value={profileSnapshot.githubUrl} />
            </SectionBlock>

            <SectionBlock title="Resumo Profissional" icon="description" iconColor="text-blue-400">
                {profileSnapshot.professionalSummary ? (
                    <p className="text-sm text-slate-100 leading-relaxed">{profileSnapshot.professionalSummary}</p>
                ) : (
                    <p className="text-sm text-slate-200">Sem resumo extraído até o momento.</p>
                )}
            </SectionBlock>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionBlock title="Competências Técnicas" icon="integration_instructions" iconColor="text-primary">
                    <TagList values={profileSnapshot.knownTechnologies} emptyLabel="Nenhuma competência técnica cadastrada." />
                </SectionBlock>
                <SectionBlock title="Soft Skills" icon="psychology" iconColor="text-blue-400">
                    <TagList values={profileSnapshot.softSkills} emptyLabel="Nenhuma soft skill cadastrada." />
                </SectionBlock>
            </div>

            <SectionBlock title="Projetos" icon="folder_open" iconColor="text-blue-400">
                {profileSnapshot.projects.length === 0 ? (
                    <p className="text-sm text-slate-200">Nenhum projeto cadastrado ainda.</p>
                ) : (
                    <div className="space-y-3">
                        {profileSnapshot.projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </SectionBlock>

            <SectionBlock title="Experiências" icon="history_edu" iconColor="text-blue-400">
                {profileSnapshot.experiences.length === 0 ? (
                    <p className="text-sm text-slate-200">Sem experiências cadastradas.</p>
                ) : (
                    <ul className="space-y-2">
                        {profileSnapshot.experiences.map((experience) => (
                            <li key={experience} className="flex items-start gap-2.5 text-sm text-slate-100">
                                <span
                                    className="material-symbols-outlined text-primary shrink-0 mt-0.5"
                                    style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                                >
                                    chevron_right
                                </span>
                                {experience}
                            </li>
                        ))}
                    </ul>
                )}
            </SectionBlock>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionBlock title="Certificações" icon="workspace_premium" iconColor="text-amber-400">
                    <TagList values={profileSnapshot.certifications} emptyLabel="Sem certificações cadastradas." />
                </SectionBlock>

                <SectionBlock title="Idiomas" icon="translate" iconColor="text-blue-400">
                    <TagList values={profileSnapshot.languages} emptyLabel="Sem idiomas cadastrados." />
                </SectionBlock>
            </div>

            {isEditing ? (
                <form className="space-y-4 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-5 shadow-sm rounded-xl" onSubmit={handleSubmit}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Editar Dados do Perfil</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>Nome</span>
                            <input
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                value={fullName}
                                maxLength={120}
                                onChange={(event) => setFullName(event.target.value)}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>Cidade</span>
                            <input
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                value={city}
                                maxLength={100}
                                onChange={(event) => setCity(event.target.value)}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>LinkedIn</span>
                            <input
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                value={linkedinUrl}
                                maxLength={500}
                                onChange={(event) => setLinkedinUrl(event.target.value)}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>GitHub</span>
                            <input
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                value={githubUrl}
                                maxLength={500}
                                onChange={(event) => setGithubUrl(event.target.value)}
                            />
                        </label>
                    </div>

                    <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                        <span>Resumo Profissional</span>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                            value={professionalSummary}
                            maxLength={3000}
                            onChange={(event) => setProfessionalSummary(event.target.value)}
                        />
                    </label>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Experiências (uma por linha)</span>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                                value={experiencesText}
                                onChange={(event) => setExperiencesText(event.target.value)}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Competências Técnicas (uma por linha ou vírgula)</span>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                                value={knownTechnologiesText}
                                onChange={(event) => setKnownTechnologiesText(event.target.value)}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Soft Skills (uma por linha)</span>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                                value={softSkillsText}
                                onChange={(event) => setSoftSkillsText(event.target.value)}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Certificações (uma por linha)</span>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                                value={certificationsText}
                                onChange={(event) => setCertificationsText(event.target.value)}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Idiomas (uma por linha)</span>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-24"
                                value={languagesText}
                                onChange={(event) => setLanguagesText(event.target.value)}
                            />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300">Novo Projeto</p>

                        <article className="border border-border-light dark:border-border-dark rounded-lg p-3 space-y-3 bg-white dark:bg-surface-dark">
                            <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                <span>Título</span>
                                <input
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                    value={newProjectDraft.title}
                                    onChange={(event) => setNewProjectDraft((current) => ({ ...current, title: event.target.value }))}
                                />
                            </label>

                            <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                <span>Descrição breve</span>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-20"
                                    value={newProjectDraft.shortDescription}
                                    onChange={(event) => setNewProjectDraft((current) => ({ ...current, shortDescription: event.target.value }))}
                                />
                            </label>

                            <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                <span>Tecnologias (separadas por vírgula)</span>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-20"
                                    value={newProjectDraft.technologiesText}
                                    onChange={(event) => setNewProjectDraft((current) => ({ ...current, technologiesText: event.target.value }))}
                                />
                            </label>

                            <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                <span>Link de deploy (opcional)</span>
                                <input
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                    value={newProjectDraft.deployUrl}
                                    onChange={(event) => setNewProjectDraft((current) => ({ ...current, deployUrl: event.target.value }))}
                                />
                            </label>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleSaveNewProject}
                                    className="cursor-pointer px-3 py-2 text-xs font-bold rounded border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors uppercase"
                                >
                                    Salvar Novo Projeto
                                </button>
                            </div>
                        </article>

                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300">Projetos na Lista</p>
                        </div>

                        {projects.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-300">
                                Nenhum projeto na lista de edição ainda.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {projects.map((project, index) => (
                                    <article
                                        key={project.localId}
                                        className="border border-border-light dark:border-border-dark rounded-lg p-3 space-y-3 bg-white dark:bg-surface-dark"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300">
                                                Projeto {index + 1}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => removeProject(project.localId)}
                                                className="cursor-pointer text-xs font-bold uppercase text-red-600 dark:text-red-400 hover:text-red-500"
                                            >
                                                Remover
                                            </button>
                                        </div>

                                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                            <span>Título</span>
                                            <input
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white"
                                                value={project.title}
                                                onChange={(event) => updateProject(project.localId, { title: event.target.value })}
                                            />
                                        </label>

                                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                            <span>Descrição breve</span>
                                            <textarea
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-20"
                                                value={project.shortDescription}
                                                onChange={(event) => updateProject(project.localId, { shortDescription: event.target.value })}
                                            />
                                        </label>

                                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                            <span>Tecnologias (separadas por vírgula)</span>
                                            <textarea
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-dark rounded dark:bg-background-dark dark:text-white min-h-20"
                                                value={project.technologiesText}
                                                onChange={(event) => updateProject(project.localId, { technologiesText: event.target.value })}
                                            />
                                        </label>

                                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
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
                        <p className="text-xs text-slate-400 dark:text-slate-300">
                            Itens atuais: {parsedPreview.knownTechnologies.length} skills derivadas de {parsedPreview.projects.length} projetos e {parsedPreview.experiences.length} experiências
                        </p>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="cursor-pointer px-4 py-2 text-xs font-bold rounded border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors uppercase disabled:opacity-60 disabled:cursor-not-allowed"
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
            ) : null}

            {feedback && !isEditing ? (
                <p role="alert" className="text-xs text-slate-200">
                    {feedback}
                </p>
            ) : null}
        </section>
    );
}
