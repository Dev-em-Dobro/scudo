export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    matchPercentage?: number;
    tags: string[];
    logo?: string;
    type: 'match' | 'skill-gap' | 'promoted';
}

export interface Skill {
    id: string;
    name: string;
    icon: string;
    unlockCount?: number;
}

export interface PeerUser {
    id: string;
    username: string;
    xp: number;
    rank: number;
    isCurrentUser?: boolean;
    avatar?: string;
}

export interface WeeklyMetric {
    label: string;
    current: number;
    goal: number;
    percentage?: number;
}

export interface UserProject {
    id: string;
    title: string;
    shortDescription?: string | null;
    technologies: string[];
    deployUrl?: string | null;
}

export interface UserProfile {
    name: string;
    email: string;
    role: string;
    avatar?: string;
    level: number;
    levelName: string;
    levelProgress: number;
    xp: number;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    city?: string | null;
    professionalSummary?: string | null;
    experiences: string[];
    knownTechnologies: string[];
    projects: UserProject[];
    certifications: string[];
    languages: string[];
    resumeSyncStatus: 'not_uploaded' | 'uploaded' | 'processing' | 'ready';
}

export type NavItem = {
    label: string;
    icon: string;
    href: string;
};
