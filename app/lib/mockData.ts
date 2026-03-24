import { Job, Skill, PeerUser, WeeklyMetric, UserProfile } from '../types';

export const mockUserProfile: UserProfile = {
    name: 'Alex Dev',
    email: '',
    role: 'Full Stack Engineer',
    isOfficialStudent: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcSyUADoPGLK0vgpOrW00IVWh1SctBQBC62CK54Uvmdxv-40nStawQ-52sY4nNgJ66UqYOmJ0SgKp5TTAIMI6mW2FVVSybyvXjUzomqch7x1fMKd7eVcZXsBRE9UMhyE1jiSJ7a5MQ2iwtr5nbxRQlUyKzd3aAv4vkXnGgCBrDe4vqsUS_f73QvF8SEDYSHBs1b8ZcEKm2nVKBYhdGxjw0qA8-LALzizLHyWlFVV2Jws1Ei7jzRF4dSFFKaa22jl0ToLhVJ2T0WTU',
    level: 4,
    levelName: 'Senior',
    levelProgress: 82,
    xp: 1850,
    linkedinUrl: null,
    githubUrl: null,
    city: null,
    professionalSummary: null,
    experiences: [],
    knownTechnologies: ['javascript', 'typescript', 'react', 'next', 'node'],
    projects: [],
    certifications: [],
    languages: [],
    resumeSyncStatus: 'not_uploaded',
    resumeFileName: null,
    resumeUploadedAt: null,
};

export const mockJobs: Job[] = [
    {
        id: '1',
        title: 'Senior Backend Engineer',
        company: 'CloudSystems Inc.',
        location: 'Remote',
        salary: '$140k - $180k',
        matchPercentage: 98,
        tags: ['Rust', 'AWS', 'Microservices'],
        type: 'match',
    },
    {
        id: '2',
        title: 'Platform Architect',
        company: 'DevFlow',
        location: 'San Francisco (Hybrid)',
        salary: '$190k - $240k',
        tags: ['Kubernetes', 'Terraform (Missing)', 'Go'],
        type: 'skill-gap',
    },
    {
        id: '3',
        title: 'Data Engineer III',
        company: 'DataStream',
        location: 'New York',
        salary: '$160k+',
        tags: ['Python', 'Spark', 'SQL'],
        type: 'promoted',
    },
];

export const mockSkills: Skill[] = [
    {
        id: '1',
        name: 'Terraform',
        icon: 'construction',
        unlockCount: 14,
    },
    {
        id: '2',
        name: 'GraphQL',
        icon: 'api',
        unlockCount: 14,
    },
];

export const mockPeers: PeerUser[] = [
    {
        id: '1',
        username: 'sarah_j',
        xp: 2450,
        rank: 1,
    },
    {
        id: '2',
        username: 'mike_r',
        xp: 2100,
        rank: 2,
    },
    {
        id: '3',
        username: 'you',
        xp: 1850,
        rank: 3,
        isCurrentUser: true,
    },
];

export const mockWeeklyMetrics: WeeklyMetric[] = [
    {
        label: 'Applications Sent',
        current: 12,
        goal: 20,
    },
    {
        label: 'Code Challenges',
        current: 3,
        goal: 5,
    },
];
