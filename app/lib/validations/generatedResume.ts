import { z } from 'zod';

const technologyGroupsSchema = z.object({
    languages: z.array(z.string().max(80)).max(50),
    frontend: z.array(z.string().max(80)).max(50),
    backend: z.array(z.string().max(80)).max(50),
    database: z.array(z.string().max(80)).max(50),
    cloud: z.array(z.string().max(80)).max(50),
    tools: z.array(z.string().max(80)).max(50),
    methodologies: z.array(z.string().max(80)).max(50),
});

const projectSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    technologies: z.array(z.string().max(80)).max(30),
    deployUrl: z.string().max(500).nullish(),
});

export const atsResumeDocumentSchema = z.object({
    header: z.object({
        fullName: z.string().trim().min(1).max(120),
        city: z.string().max(100).nullable(),
        email: z.string().email().max(200),
        linkedinUrl: z.string().max(300).nullable(),
        githubUrl: z.string().max(300).nullable(),
    }),
    professionalSummary: z.string().max(3000).nullable(),
    experiences: z.array(z.string().max(500)).max(30),
    projects: z.array(projectSchema).max(30),
    education: z.array(z.string().max(300)).max(20),
    technologyGroups: technologyGroupsSchema,
    certifications: z.array(z.string().max(200)).max(30),
    languages: z.array(z.string().max(100)).max(20),
    lastUpdatedAt: z.string().datetime(),
    lastRankName: z.string().max(80).nullable(),
    customizedAt: z.string().datetime().nullable().optional(),
}).strict();
