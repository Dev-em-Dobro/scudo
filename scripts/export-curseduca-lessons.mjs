import fs from "node:fs/promises";
import path from "node:path";

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
    }
    return value;
}

async function fetchLessonsPage({ baseUrl, apiKey, apiToken, limit, offset }) {
    const url = new URL("/reports/lessons", baseUrl);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiToken}`,
            api_key: apiKey,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `Falha ao buscar ${url.toString()} (${response.status}): ${body}`,
        );
    }

    return response.json();
}

function normalizeLesson(lesson) {
    return {
        classId: lesson.id,
        lessonUuid: lesson.uuid ?? null,
        lessonTitle: lesson.title ?? null,
        lessonOrder: lesson.order ?? null,
        lessonType: lesson.type?.identifier ?? null,
        lessonTypeId: lesson.type?.id ?? null,
        sectionTitle: lesson.section?.title ?? null,
        sectionOrder: lesson.section?.order ?? null,
        courseTitle: lesson.section?.content?.title ?? null,
        courseSlug: lesson.section?.content?.slug ?? null,
        lessonLink: lesson.link ?? null,
        createdAt: lesson.createdAt ?? null,
    };
}

async function main() {
    const baseUrl = requiredEnv("CURSEDUCA_CONTENTS_API_URL");
    const apiKey = requiredEnv("CURSEDUCA_API_KEY");
    const apiToken = requiredEnv("CURSEDUCA_API_TOKEN");

    const limit = Number(process.env.CURSEDUCA_LESSONS_PAGE_LIMIT ?? 200);
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("CURSEDUCA_LESSONS_PAGE_LIMIT invalido.");
    }

    let offset = 0;
    let hasMore = true;
    const lessons = [];

    while (hasMore) {
        const payload = await fetchLessonsPage({
            baseUrl,
            apiKey,
            apiToken,
            limit,
            offset,
        });

        const pageData = Array.isArray(payload?.data) ? payload.data : [];
        lessons.push(...pageData.map(normalizeLesson));

        const metadata = payload?.metadata ?? {};
        hasMore = Boolean(metadata.hasMore ?? metadata.hasmore);
        offset += limit;
    }

    lessons.sort((a, b) => {
        if (a.courseTitle !== b.courseTitle) {
            return String(a.courseTitle).localeCompare(String(b.courseTitle));
        }
        if (a.sectionOrder !== b.sectionOrder) {
            return Number(a.sectionOrder ?? 0) - Number(b.sectionOrder ?? 0);
        }
        if (a.lessonOrder !== b.lessonOrder) {
            return Number(a.lessonOrder ?? 0) - Number(b.lessonOrder ?? 0);
        }
        return Number(a.classId ?? 0) - Number(b.classId ?? 0);
    });

    const groupedByCourse = lessons.reduce((acc, lesson) => {
        const key = lesson.courseSlug || lesson.courseTitle || "sem-curso";
        if (!acc[key]) {
            acc[key] = {
                courseTitle: lesson.courseTitle,
                courseSlug: lesson.courseSlug,
                lessons: [],
            };
        }
        acc[key].lessons.push(lesson);
        return acc;
    }, {});

    const output = {
        generatedAt: new Date().toISOString(),
        totalLessons: lessons.length,
        totalCourses: Object.keys(groupedByCourse).length,
        lessons,
        courses: Object.values(groupedByCourse),
    };

    const outputPath = path.resolve(
        process.cwd(),
        "docs/curseduca-lessons-catalog.json",
    );
    await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");

    console.log(
        `Arquivo gerado em ${outputPath} com ${output.totalLessons} aulas (${output.totalCourses} cursos).`,
    );
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
