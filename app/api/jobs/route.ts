import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { JobLevel, JobSource, Prisma } from "@prisma/client";

import { auth } from "@/app/lib/auth";
import { buildRecentJobsWhere, JOB_LISTING_EXCLUDED_STACK_WHERE } from "@/app/lib/jobs/jobBoard";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const allowedLevels = new Set<JobLevel>(["ESTAGIO", "JUNIOR", "PLENO", "SENIOR", "OUTRO"]);
const allowedSources = new Set<JobSource>(["LINKEDIN", "GUPY", "COMPANY_SITE", "OTHER"]);

function parseLimit(value: string | null) {
    const raw = Number(value ?? "20");
    if (Number.isNaN(raw)) {
        return 20;
    }

    return Math.min(Math.max(raw, 1), 100);
}

export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const levelParam = searchParams.get("level");
    const sourceParam = searchParams.get("source");
    const remoteParam = searchParams.get("remote");
    const queryParam = searchParams.get("q")?.trim();
    const limit = parseLimit(searchParams.get("limit"));

    const andFilters: Prisma.JobWhereInput[] = [
        buildRecentJobsWhere(),
        JOB_LISTING_EXCLUDED_STACK_WHERE,
    ];

    if (levelParam && allowedLevels.has(levelParam as JobLevel)) {
        andFilters.push({ level: levelParam as JobLevel });
    }

    if (sourceParam && allowedSources.has(sourceParam as JobSource)) {
        andFilters.push({ source: sourceParam as JobSource });
    }

    if (remoteParam === "true") {
        andFilters.push({ isRemote: true });
    } else if (remoteParam === "false") {
        andFilters.push({ isRemote: false });
    }

    if (queryParam) {
        andFilters.push({
            OR: [
                { title: { contains: queryParam, mode: "insensitive" } },
                { companyName: { contains: queryParam, mode: "insensitive" } },
                { stack: { has: queryParam.toLowerCase() } },
            ],
        });
    }

    const where: Prisma.JobWhereInput = { AND: andFilters };

    const jobs = await prisma.job.findMany({
        where,
        take: limit,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: {
            id: true,
            title: true,
            companyName: true,
            level: true,
            stack: true,
            location: true,
            isRemote: true,
            publishedAt: true,
            source: true,
            sourceUrl: true,
            createdAt: true,
        },
    });

    return NextResponse.json({
        items: jobs,
        count: jobs.length,
    });
}
