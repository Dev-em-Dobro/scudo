import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { JobLevel, JobSource, Prisma } from "@prisma/client";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const allowedLevels = new Set<JobLevel>(["ESTAGIO", "JUNIOR", "PLENO", "SENIOR", "OUTRO"]);
const allowedSources = new Set<JobSource>(["LINKEDIN", "GUPY", "COMPANY_SITE", "OTHER"]);

const nonTargetStackExclude = [
    "c",
    "c++",
    "python",
    "go",
    "golang",
    "rust",
    "zig",
    "assembly",
    "firmware",
    "embedded",
    "microcontrolador",
    "data-science",
    "machine-learning",
    "deep-learning",
    "data-engineering",
    "data-analytics",
    "analytics",
    "pandas",
    "numpy",
    "pytorch",
    "tensorflow",
    "spark",
    "databricks",
];

const nonTargetTitleKeywords = [
    "python",
    "golang",
    "linguagem go",
    "data science",
    "ciência de dados",
    "cientista de dados",
    "machine learning",
    "deep learning",
    "ml engineer",
    "engenheiro de dados",
    "data engineer",
    "data analytics",
    "analista de dados",
    "c++",
    "linguagem c",
    "embedded",
    "embarcado",
    "firmware",
    "microcontrolador",
    "assembly",
];

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

    const where: Prisma.JobWhereInput = {
        NOT: {
            OR: [
                {
                    stack: {
                        hasSome: nonTargetStackExclude,
                    },
                },
                ...nonTargetTitleKeywords.map((keyword) => ({
                    title: {
                        contains: keyword,
                        mode: "insensitive" as const,
                    },
                })),
            ],
        },
    };

    if (levelParam && allowedLevels.has(levelParam as JobLevel)) {
        where.level = levelParam as JobLevel;
    }

    if (sourceParam && allowedSources.has(sourceParam as JobSource)) {
        where.source = sourceParam as JobSource;
    }

    if (remoteParam === "true") {
        where.isRemote = true;
    } else if (remoteParam === "false") {
        where.isRemote = false;
    }

    if (queryParam) {
        where.OR = [
            { title: { contains: queryParam, mode: "insensitive" } },
            { companyName: { contains: queryParam, mode: "insensitive" } },
            { stack: { has: queryParam.toLowerCase() } },
        ];
    }

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
