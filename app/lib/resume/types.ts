export type AtsResumeProject = {
    /** Identifica a origem para manter projetos pessoais depois dos projetos da jornada. */
    source?: 'course' | 'manual';
    /** Chave estável do catálogo, preservada quando o aluno edita o título. */
    courseProjectKey?: string;
    title: string;
    description: string;
    technologies: string[];
    /** Link do projeto no ar (deploy). Pode ser placeholder até o aluno preencher. */
    deployUrl?: string | null;
    /** Link do repositório no GitHub. Pode ser placeholder até o aluno preencher. */
    repositoryUrl?: string | null;
};

export type AtsResumeTechnologyGroups = {
    languages: string[];
    frontend: string[];
    backend: string[];
    database: string[];
    cloud: string[];
    tools: string[];
    methodologies: string[];
};

export type AtsResumeDocument = {
    header: {
        fullName: string;
        city: string | null;
        email: string;
        linkedinUrl: string | null;
        githubUrl: string | null;
    };
    professionalSummary: string | null;
    experiences: string[];
    projects: AtsResumeProject[];
    education: string[];
    technologyGroups: AtsResumeTechnologyGroups;
    certifications: string[];
    languages: string[];
    lastUpdatedAt: string;
    lastRankName: string | null;
    /** Quando definido, o aluno personalizou o documento no editor. */
    customizedAt?: string | null;
};

export type GeneratedResumeMeta = {
    available: boolean;
    updatedAt: string | null;
    stageId: string | null;
    rankName: string | null;
    projectCount: number;
};
