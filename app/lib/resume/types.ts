export type AtsResumeProject = {
    title: string;
    description: string;
    technologies: string[];
    deployUrl?: string | null;
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
