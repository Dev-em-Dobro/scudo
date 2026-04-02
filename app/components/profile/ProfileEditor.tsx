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

type ValidationIssue = {
    path?: Array<string | number>;
    message?: string;
};

const LANGUAGE_CANONICAL_MAP: Record<string, string> = {
    portugues: 'Português',
    ingles: 'Inglês',
    espanhol: 'Espanhol',
    frances: 'Francês',
    alemao: 'Alemão',
};

const LANGUAGE_LEVEL_CANONICAL_MAP: Record<string, string> = {
    nativo: 'Nativo',
    fluente: 'Fluente',
    avancado: 'Avançado',
    intermediario: 'Intermediário',
    basico: 'Básico',
};

const FIELD_LIMITS = {
    fullName: 120,
    city: 100,
    linkedinUrl: 500,
    githubUrl: 500,
    professionalSummary: 3000,
    experiencesItem: 300,
    knownTechnologiesItem: 80,
    softSkillsItem: 100,
    certificationsItem: 200,
    languagesItem: 100,
    projectsTitle: 200,
    projectsShortDescription: 1000,
    projectsTechnologyItem: 80,
    projectsDeployUrl: 500,
};

function getFieldClass(hasError: boolean) {
    const base = 'w-full px-3 py-2 border rounded dark:bg-background-dark dark:text-white';
    return hasError
        ? `${base} border-red-500/80 focus:outline-none focus:ring-2 focus:ring-red-500/40`
        : `${base} border-slate-300 dark:border-border-dark`;
}

function addFieldError(target: Record<string, string>, key: string, message: string) {
    if (!target[key]) {
        target[key] = message;
    }
}

function addLengthErrorsForList(
    target: Record<string, string>,
    values: string[],
    fieldKey: string,
    maxLength: number,
    itemLabel: string,
) {
    values.forEach((value, index) => {
        if (value.length > maxLength) {
            addFieldError(target, `${fieldKey}.${index}`, `${itemLabel} ${index + 1} excede ${maxLength} caracteres.`);
        }
    });
}

function addProjectLengthErrors(target: Record<string, string>, projects: Array<{
    title: string;
    shortDescription: string | null;
    technologies: string[];
    deployUrl: string | null;
}>) {
    projects.forEach((project, projectIndex) => {
        if (project.title.length > FIELD_LIMITS.projectsTitle) {
            addFieldError(target, `projects.${projectIndex}.title`, `O título do projeto ${projectIndex + 1} excede ${FIELD_LIMITS.projectsTitle} caracteres.`);
        }

        if ((project.shortDescription ?? '').length > FIELD_LIMITS.projectsShortDescription) {
            addFieldError(target, `projects.${projectIndex}.shortDescription`, `A descrição do projeto ${projectIndex + 1} excede ${FIELD_LIMITS.projectsShortDescription} caracteres.`);
        }

        if ((project.deployUrl ?? '').length > FIELD_LIMITS.projectsDeployUrl) {
            addFieldError(target, `projects.${projectIndex}.deployUrl`, `O link de deploy do projeto ${projectIndex + 1} excede ${FIELD_LIMITS.projectsDeployUrl} caracteres.`);
        }

        project.technologies.forEach((technology, techIndex) => {
            if (technology.length > FIELD_LIMITS.projectsTechnologyItem) {
                addFieldError(target, `projects.${projectIndex}.technologies.${techIndex}`, `Uma tecnologia do projeto ${projectIndex + 1} excede ${FIELD_LIMITS.projectsTechnologyItem} caracteres.`);
            }
        });
    });
}

function parseApiValidationErrors(issues: ValidationIssue[] | undefined) {
    const nextErrors: Record<string, string> = {};
    if (!Array.isArray(issues)) {
        return nextErrors;
    }

    for (const issue of issues) {
        const key = Array.isArray(issue.path) ? issue.path.join('.') : 'form';
        const message = issue.message ?? 'Valor inválido.';
        addFieldError(nextErrors, key, message);

        const firstPath = issue.path?.[0];
        if (typeof firstPath === 'string') {
            addFieldError(nextErrors, firstPath, message);
        }
    }

    return nextErrors;
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

function normalizeAscii(value: string) {
    return value
        .normalize('NFD')
        .replaceAll(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeLanguageEntry(value: string) {
    const cleaned = value.trim();
    if (!cleaned) {
        return null;
    }

    const normalized = normalizeAscii(cleaned);
    if (/experien|profission|projet|atividad|freelancer|empresa|resumo|habilidade|tecnolog|certifica|formacao/.test(normalized)) {
        return null;
    }

    const languageKey = Object.keys(LANGUAGE_CANONICAL_MAP).find((key) => new RegExp(String.raw`\b${key}\b`).exec(normalized));
    if (!languageKey) {
        return null;
    }

    const language = LANGUAGE_CANONICAL_MAP[languageKey];
    const levelMatch = /\b(nativo|fluente|avancado|intermediario|basico)\b/.exec(normalized);
    if (!levelMatch?.[1]) {
        return language;
    }

    const level = LANGUAGE_LEVEL_CANONICAL_MAP[levelMatch[1]];
    return level ? `${language} - ${level}` : language;
}

function normalizeLanguageList(values: string[]) {
    return [...new Set(values
        .flatMap((value) => value.split(/[|;,]/))
        .map((value) => normalizeLanguageEntry(value))
        .filter((value): value is string => value !== null))];
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

type ExperienceDisplayItem = {
    id: string;
    headline: string;
    subheadline: string | null;
    period: string | null;
    descriptions: string[];
};

function parseExperienceDisplayItems(experiences: string[]): ExperienceDisplayItem[] {
    const items: ExperienceDisplayItem[] = [];
    let current: ExperienceDisplayItem | null = null;

    const buildItem = (headlineRaw: string, index: number): ExperienceDisplayItem => {
        const normalized = headlineRaw.trim();
        const periodInParentheses = /\(([^)]+)\)\s*$/.exec(normalized)?.[1]?.trim() ?? null;
        const headline = periodInParentheses
            ? normalized.replace(/\(([^)]+)\)\s*$/, '').trim().replace(/[\s\-–]+$/, '')
            : normalized;

        return {
            id: `exp-${index}`,
            headline,
            subheadline: null,
            period: periodInParentheses,
            descriptions: [],
        };
    };

    const isActivityLine = (value: string) => {
        return /^atividades?\s*:/i.test(value)
            || /^[-•·]\s+/.test(value)
            || /^(desenvolvimento|implementa[cç][aã]o|lideran[cç]a|redu[cç][aã]o|manuten[cç][aã]o|integra[cç][aã]o|participa[cç][aã]o|respons[aá]vel)/i.test(value);
    };

    const stripActivityPrefix = (value: string) => {
        return value
            .replace(/^atividades?\s*:\s*/i, '')
            .replace(/^[-•·]\s+/, '')
            .trim();
    };

    const isPeriodLine = (value: string) => {
        const normalized = normalizeAscii(value);
        const hasMonthToken = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
            .some((token) => normalized.includes(token));

        return hasMonthToken
            || /\b(presente|atual|current)\b/.test(normalized)
            || /^\d{4}\s*[-–]\s*\d{4}$/.test(value)
            || /^\d{2}\/\d{4}\s*[-–]\s*\d{2}\/\d{4}$/i.test(value);
    };

    const isCompanyLine = (value: string) => {
        const normalized = normalizeAscii(value);
        return /\b(ltda|s\.a|sa|me|eireli|company|tech|solucoes|digital|studio|instituto)\b/.test(normalized)
            || /\b[A-Z]{2}\b/.test(value)
            || /,\s*[A-Z]{2}\b/.test(value)
            || /\s[-–]\s/.test(value);
    };

    experiences.forEach((line, index) => {
        const normalized = line.trim();
        if (!normalized) {
            return;
        }

        if (isActivityLine(normalized)) {
            if (!current) {
                current = buildItem('Experiência', index);
                items.push(current);
            }
            const description = stripActivityPrefix(normalized);
            if (description) {
                current.descriptions.push(description);
            }
            return;
        }

        if (current && !current.subheadline && isCompanyLine(normalized)) {
            current.subheadline = normalized;
            return;
        }

        if (current && !current.period && isPeriodLine(normalized)) {
            current.period = normalized;
            return;
        }

        current = buildItem(normalized, index);
        items.push(current);
    });

    return items;
}

function ProjectCard({ project }: Readonly<{ project: UserProject }>) {
    const extractProjectDisplayData = (sourceProject: UserProject) => {
        const sanitizeUrl = (url: string) => url.replaceAll(/[).,;]+$/g, '').trim();
        const repoRegex = /https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i;
        const deployRegex = /https?:\/\/(?:www\.)?[^\s)]*(?:vercel\.app|netlify\.app|onrender\.com|herokuapp\.com|fly\.dev)[^\s)]*/i;

        let cleanedDescription = sourceProject.shortDescription ?? '';
        let repositoryUrl: string | null = null;
        let deployUrl: string | null = sourceProject.deployUrl ?? null;

        cleanedDescription = cleanedDescription.replaceAll(
            /(reposit[oó]rio|repository|github|deploy|demo)\s*:\s*(https?:\/\/[^\s)]+)/gi,
            (_fullMatch, rawLabel, rawUrl) => {
                const label = String(rawLabel).toLowerCase();
                const url = sanitizeUrl(String(rawUrl));

                if (!repositoryUrl && /reposit[oó]rio|repository|github/.test(label)) {
                    repositoryUrl = url;
                }

                if (!deployUrl && /deploy|demo/.test(label)) {
                    deployUrl = url;
                }

                return '';
            },
        );

        if (!repositoryUrl) {
            const repoMatch = repoRegex.exec(cleanedDescription);
            if (repoMatch?.[0]) {
                repositoryUrl = sanitizeUrl(repoMatch[0]);
                cleanedDescription = cleanedDescription.replaceAll(repoMatch[0], '');
            }
        }

        if (!deployUrl) {
            const deployMatch = deployRegex.exec(cleanedDescription);
            if (deployMatch?.[0]) {
                deployUrl = sanitizeUrl(deployMatch[0]);
                cleanedDescription = cleanedDescription.replaceAll(deployMatch[0], '');
            }
        }

        const normalizedDescription = cleanedDescription
            .replaceAll(/\s{2,}/g, ' ')
            .replaceAll(/\s+([.,;:!?])/g, '$1')
            .trim();

        return {
            repositoryUrl,
            deployUrl,
            cleanedDescription: normalizedDescription.length > 0 ? normalizedDescription : null,
        };
    };

    const projectDisplay = extractProjectDisplayData(project);

    return (
        <article className="border border-border-light dark:border-border-dark rounded-xl p-4 bg-slate-50 dark:bg-background-dark space-y-3 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-white">{project.title}</p>
                {projectDisplay.repositoryUrl || projectDisplay.deployUrl ? (
                    <div className="flex shrink-0 items-center gap-2">
                        {projectDisplay.repositoryUrl ? (
                            <a
                                href={projectDisplay.repositoryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-slate-100 border border-border-dark rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>
                                    code
                                </span>
                                {' '}
                                Repositório
                            </a>
                        ) : null}

                        {projectDisplay.deployUrl ? (
                            <a
                                href={projectDisplay.deployUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>
                                    open_in_new
                                </span>
                                {' '}
                                Deploy
                            </a>
                        ) : null}
                    </div>
                ) : (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-200 border border-border-dark rounded-lg">
                        Sem deploy
                    </span>
                )}
            </div>

            {projectDisplay.cleanedDescription ? (
                <p className="text-xs text-slate-100 leading-relaxed">{projectDisplay.cleanedDescription}</p>
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

// SONAR: componente consolidado de edição/preview; refatoração completa para subcomponentes ficará para tarefa dedicada.
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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const experienceDisplayItems = useMemo(
        () => parseExperienceDisplayItems(profileSnapshot.experiences),
        [profileSnapshot.experiences],
    );

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
            languages: normalizeLanguageList(fromTextAreaValue(languagesText)),
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

    function getFieldError(fieldKey: string) {
        if (fieldErrors[fieldKey]) {
            return fieldErrors[fieldKey];
        }

        const prefixedEntry = Object.entries(fieldErrors).find(([key]) => key.startsWith(`${fieldKey}.`));
        return prefixedEntry?.[1] ?? null;
    }

    function validateBeforeSubmit() {
        const nextErrors: Record<string, string> = {};

        addLengthErrorsForList(nextErrors, parsedPreview.experiences, 'experiences', FIELD_LIMITS.experiencesItem, 'A experiência');
        addLengthErrorsForList(nextErrors, parsedPreview.languages, 'languages', FIELD_LIMITS.languagesItem, 'O idioma');
        addLengthErrorsForList(nextErrors, parsedPreview.certifications, 'certifications', FIELD_LIMITS.certificationsItem, 'A certificação');
        addLengthErrorsForList(nextErrors, parsedPreview.softSkills, 'softSkills', FIELD_LIMITS.softSkillsItem, 'A habilidade');
        addLengthErrorsForList(nextErrors, parsedPreview.knownTechnologies, 'knownTechnologies', FIELD_LIMITS.knownTechnologiesItem, 'A tecnologia');
        addProjectLengthErrors(nextErrors, parsedPreview.projects);

        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
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
        setFieldErrors({});
        setFeedback(null);
        setIsEditing(true);
    }

    function handleCancelEdit() {
        syncDraftFromProfile(profileSnapshot);
        setFieldErrors({});
        setFeedback(null);
        setIsEditing(false);
    }

    async function handleSubmit(event: { preventDefault: () => void }) {
        event.preventDefault();
        if (!validateBeforeSubmit()) {
            setFeedback('Revise os campos destacados em vermelho antes de salvar.');
            return;
        }

        setIsSaving(true);
        setFeedback(null);
        setFieldErrors({});

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
                details?: ValidationIssue[];
            };

            if (!response.ok) {
                if (Array.isArray(payload.details)) {
                    const nextErrors = parseApiValidationErrors(payload.details);
                    setFieldErrors(nextErrors);
                }
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
                        className="cursor-pointer px-4 py-2 text-xs font-bold rounded border border-primary bg-primary hover:bg-primary/90 text-white transition-colors uppercase"
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
                <SectionBlock title="Habilidades comportamentais" icon="psychology" iconColor="text-blue-400">
                    <TagList values={profileSnapshot.softSkills} emptyLabel="Nenhuma habilidade comportamental cadastrada." />
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
                {experienceDisplayItems.length === 0 ? (
                    <p className="text-sm text-slate-200">Sem experiências cadastradas.</p>
                ) : (
                    <div className="space-y-3">
                        {experienceDisplayItems.map((experience) => (
                            <article
                                key={experience.id}
                                className="rounded-xl border border-border-light dark:border-border-dark bg-slate-50 dark:bg-background-dark p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-white leading-snug">{experience.headline}</p>
                                        {experience.subheadline ? (
                                            <p className="mt-1 text-sm italic text-slate-300">{experience.subheadline}</p>
                                        ) : null}
                                    </div>
                                    {experience.period ? (
                                        <span className="inline-flex shrink-0 items-center rounded-lg border border-border-dark px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                                            {experience.period}
                                        </span>
                                    ) : null}
                                </div>

                                {experience.descriptions.length > 0 ? (
                                    <div className="mt-3 space-y-2">
                                        {experience.descriptions.map((description, index) => (
                                            <p key={`${experience.id}-desc-${index}`} className="text-sm text-slate-200 leading-relaxed">
                                                {description}
                                            </p>
                                        ))}
                                    </div>
                                ) : null}
                            </article>
                        ))}
                    </div>
                )}
            </SectionBlock>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionBlock title="Certificações" icon="workspace_premium" iconColor="text-amber-400">
                    <TagList values={profileSnapshot.certifications} emptyLabel="Sem certificações cadastradas." />
                </SectionBlock>

                <SectionBlock title="Idiomas" icon="translate" iconColor="text-blue-400">
                    <TagList values={normalizeLanguageList(profileSnapshot.languages)} emptyLabel="Sem idiomas cadastrados." />
                </SectionBlock>
            </div>

            {isEditing ? (
                <form className="space-y-4 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-5 shadow-sm rounded-xl" onSubmit={handleSubmit}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Editar Dados do Perfil</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-300">
                        Limites por item: experiências até {FIELD_LIMITS.experiencesItem} caracteres, idiomas até {FIELD_LIMITS.languagesItem}, descrição de projeto até {FIELD_LIMITS.projectsShortDescription} e cidade até {FIELD_LIMITS.city}.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>Nome</span>
                            <input
                                className={getFieldClass(Boolean(getFieldError('fullName')))}
                                value={fullName}
                                maxLength={120}
                                aria-invalid={Boolean(getFieldError('fullName'))}
                                onChange={(event) => setFullName(event.target.value)}
                            />
                            {getFieldError('fullName') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('fullName')}</span> : null}
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>Cidade</span>
                            <input
                                className={getFieldClass(Boolean(getFieldError('city')))}
                                value={city}
                                maxLength={100}
                                aria-invalid={Boolean(getFieldError('city'))}
                                onChange={(event) => setCity(event.target.value)}
                            />
                            {getFieldError('city') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('city')}</span> : null}
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>LinkedIn</span>
                            <input
                                className={getFieldClass(Boolean(getFieldError('linkedinUrl')))}
                                value={linkedinUrl}
                                maxLength={500}
                                aria-invalid={Boolean(getFieldError('linkedinUrl'))}
                                onChange={(event) => setLinkedinUrl(event.target.value)}
                            />
                            {getFieldError('linkedinUrl') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('linkedinUrl')}</span> : null}
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2">
                            <span>GitHub</span>
                            <input
                                className={getFieldClass(Boolean(getFieldError('githubUrl')))}
                                value={githubUrl}
                                maxLength={500}
                                aria-invalid={Boolean(getFieldError('githubUrl'))}
                                onChange={(event) => setGithubUrl(event.target.value)}
                            />
                            {getFieldError('githubUrl') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('githubUrl')}</span> : null}
                        </label>
                    </div>

                    <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                        <span>Resumo Profissional</span>
                        <textarea
                            className={`${getFieldClass(Boolean(getFieldError('professionalSummary')))} min-h-24`}
                            value={professionalSummary}
                            maxLength={3000}
                            aria-invalid={Boolean(getFieldError('professionalSummary'))}
                            onChange={(event) => setProfessionalSummary(event.target.value)}
                        />
                        {getFieldError('professionalSummary') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('professionalSummary')}</span> : null}
                    </label>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Experiências (uma por linha)</span>
                            <textarea
                                className={`${getFieldClass(Boolean(getFieldError('experiences')))} min-h-24`}
                                value={experiencesText}
                                aria-invalid={Boolean(getFieldError('experiences'))}
                                onChange={(event) => setExperiencesText(event.target.value)}
                            />
                            {getFieldError('experiences') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('experiences')}</span> : null}
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Competências Técnicas (uma por linha ou vírgula)</span>
                            <textarea
                                className={`${getFieldClass(Boolean(getFieldError('knownTechnologies')))} min-h-24`}
                                value={knownTechnologiesText}
                                aria-invalid={Boolean(getFieldError('knownTechnologies'))}
                                onChange={(event) => setKnownTechnologiesText(event.target.value)}
                            />
                            {getFieldError('knownTechnologies') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('knownTechnologies')}</span> : null}
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Habilidades comportamentais (uma por linha)</span>
                            <textarea
                                className={`${getFieldClass(Boolean(getFieldError('softSkills')))} min-h-24`}
                                value={softSkillsText}
                                aria-invalid={Boolean(getFieldError('softSkills'))}
                                onChange={(event) => setSoftSkillsText(event.target.value)}
                            />
                            {getFieldError('softSkills') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('softSkills')}</span> : null}
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Certificações (uma por linha)</span>
                            <textarea
                                className={`${getFieldClass(Boolean(getFieldError('certifications')))} min-h-24`}
                                value={certificationsText}
                                aria-invalid={Boolean(getFieldError('certifications'))}
                                onChange={(event) => setCertificationsText(event.target.value)}
                            />
                            {getFieldError('certifications') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('certifications')}</span> : null}
                        </label>

                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                            <span>Idiomas (uma por linha)</span>
                            <textarea
                                className={`${getFieldClass(Boolean(getFieldError('languages')))} min-h-24`}
                                value={languagesText}
                                aria-invalid={Boolean(getFieldError('languages'))}
                                onChange={(event) => setLanguagesText(event.target.value)}
                            />
                            {getFieldError('languages') ? <span className="text-[11px] normal-case text-red-400">{getFieldError('languages')}</span> : null}
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
                                    className="cursor-pointer px-3 py-2 text-xs font-bold rounded border border-primary bg-primary hover:bg-primary/90 text-white transition-colors uppercase"
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
                                                className={getFieldClass(Boolean(getFieldError(`projects.${index}.title`)))}
                                                value={project.title}
                                                aria-invalid={Boolean(getFieldError(`projects.${index}.title`))}
                                                onChange={(event) => updateProject(project.localId, { title: event.target.value })}
                                            />
                                            {getFieldError(`projects.${index}.title`) ? <span className="text-[11px] normal-case text-red-400">{getFieldError(`projects.${index}.title`)}</span> : null}
                                        </label>

                                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                            <span>Descrição breve</span>
                                            <textarea
                                                className={getFieldClass(Boolean(getFieldError(`projects.${index}.shortDescription`))) + ' min-h-20'}
                                                value={project.shortDescription}
                                                aria-invalid={Boolean(getFieldError(`projects.${index}.shortDescription`))}
                                                onChange={(event) => updateProject(project.localId, { shortDescription: event.target.value })}
                                            />
                                            {getFieldError(`projects.${index}.shortDescription`) ? <span className="text-[11px] normal-case text-red-400">{getFieldError(`projects.${index}.shortDescription`)}</span> : null}
                                        </label>

                                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                            <span>Tecnologias (separadas por vírgula)</span>
                                            <textarea
                                                className={getFieldClass(Boolean(getFieldError(`projects.${index}.technologies`))) + ' min-h-20'}
                                                value={project.technologiesText}
                                                aria-invalid={Boolean(getFieldError(`projects.${index}.technologies`))}
                                                onChange={(event) => updateProject(project.localId, { technologiesText: event.target.value })}
                                            />
                                            {getFieldError(`projects.${index}.technologies`) ? <span className="text-[11px] normal-case text-red-400">{getFieldError(`projects.${index}.technologies`)}</span> : null}
                                        </label>

                                        <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-300 space-y-2 block">
                                            <span>Link de deploy (opcional)</span>
                                            <input
                                                className={getFieldClass(Boolean(getFieldError(`projects.${index}.deployUrl`)))}
                                                value={project.deployUrl}
                                                aria-invalid={Boolean(getFieldError(`projects.${index}.deployUrl`))}
                                                onChange={(event) => updateProject(project.localId, { deployUrl: event.target.value })}
                                            />
                                            {getFieldError(`projects.${index}.deployUrl`) ? <span className="text-[11px] normal-case text-red-400">{getFieldError(`projects.${index}.deployUrl`)}</span> : null}
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
                            className="cursor-pointer px-4 py-2 text-xs font-bold rounded border border-primary bg-primary hover:bg-primary/90 text-white transition-colors uppercase disabled:opacity-60 disabled:cursor-not-allowed"
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
