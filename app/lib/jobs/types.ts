import type { Job, JobLevel, JobSource } from "@prisma/client";

export type JobListItem = Pick<
    Job,
    | "id"
    | "title"
    | "companyName"
    | "level"
    | "stack"
    | "location"
    | "isRemote"
    | "publishedAt"
    | "source"
    | "sourceUrl"
    | "createdAt"
>;

export type NormalizedJobInput = {
    title: string;
    companyName: string;
    level: JobLevel;
    stack: string[];
    location: string | null;
    isRemote: boolean;
    publishedAt: Date | null;
    source: JobSource;
    sourceUrl: string;
    externalId: string | null;
    fingerprint: string;
};

export type RawSourceJob = {
    title: string;
    companyName: string;
    level?: string | null;
    stack?: string[] | string | null;
    description?: string | null;
    location?: string | null;
    publishedAt?: string | Date | null;
    sourceUrl: string;
    source?: JobSource;
    externalId?: string | null;
};
