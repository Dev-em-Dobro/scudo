import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

import { loadCodeCatalogTaskByLessonId, loadCodeCatalogTasks } from "./load-code-catalog.mjs";
import {
    getDefaultJornadaCourseSlugs,
    isJornadaBoardCourseSlug,
    resolveCourseSlugFromCatalog,
} from "../dobro-api/courses-catalog.mjs";

const baseUrl = (process.env.DOBRO_API_BASE_URL ?? "https://dobro-api.vercel.app").replace(/\/$/, "");
const apiKey = (process.env.DOBRO_API_KEY ?? "").trim();
const singleCourseSlug = (process.env.DOBRO_API_COURSE_SLUG ?? process.argv[2] ?? "").trim();
const databaseUrl =
    (process.env.CATALOG_DATABASE_URL ?? process.env.LOCAL_DATABASE_URL ?? "").trim();
const outputPath = path.resolve(
    process.cwd(),
    process.env.JORNADA_RECONCILE_OUTPUT ?? "docs/jornada-catalog-reconcile.latest.json",
);

if (!apiKey) {
    console.error("Defina DOBRO_API_KEY no .env.");
    process.exit(1);
}

async function fetchCourseTree(slug) {
    const response = await fetch(`${baseUrl}/api/v1/courses/${encodeURIComponent(slug)}/tree`, {
        headers: {
            "x-api-key": apiKey,
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(20_000),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(body?.message ?? `Falha ao buscar árvore (HTTP ${response.status}).`);
    }

    return body;
}

async function resolveCourseSlugsForReconcile() {
    if (singleCourseSlug) {
        const resolved = resolveCourseSlugFromCatalog(singleCourseSlug);
        if (!isJornadaBoardCourseSlug(resolved)) {
            console.warn(
                `[reconcile] Aviso: "${resolved}" não está na allowlist do board (jornada-course-slugs.json).`,
            );
        }
        return [resolved];
    }

    return getDefaultJornadaCourseSlugs();
}

async function fetchAllExternalLessons(slugs) {
    const externalLessons = [];
    const coursesUsed = [];

    for (const slug of slugs) {
        const tree = await fetchCourseTree(slug);
        coursesUsed.push({ slug: tree.slug, title: tree.title });

        for (const module of tree.modules ?? []) {
            for (const lesson of module.lessons ?? []) {
                externalLessons.push({
                    curseducaId: lesson.curseducaId,
                    title: lesson.title,
                    order: lesson.order,
                    moduleTitle: module.title,
                    moduleOrder: module.order,
                    courseSlug: tree.slug,
                    courseTitle: tree.title,
                    link: lesson.link ?? null,
                });
            }
        }
    }

    return { externalLessons, coursesUsed };
}

async function loadPublishedCatalogFromDb() {
    if (!databaseUrl) {
        return null;
    }

    const client = new pg.Client({ connectionString: databaseUrl });

    try {
        await client.connect();

        const result = await client.query(`
            select
              "taskId",
              "stageId",
              "kind",
              "title",
              "order",
              "isActive",
              "externalLessonId"
            from "JornadaCatalogTask"
            where "isActive" = true
            order by "stageId", "order"
        `);

        if (result.rowCount === 0) {
            return null;
        }

        return result.rows;
    } catch (error) {
        if (error instanceof Error && /relation .* does not exist/i.test(error.message)) {
            return null;
        }

        console.warn(
            `[reconcile] Catálogo no banco indisponível (${databaseUrl}) — usando fallback do código.`,
        );
        console.warn(error instanceof Error ? error.message : String(error));
        return null;
    } finally {
        await client.end().catch(() => undefined);
    }
}

function loadPublishedCatalogFromCode() {
    return loadCodeCatalogTasks().map((task) => ({
        taskId: task.taskId,
        stageId: task.stageId,
        kind: task.kind,
        title: task.title,
        order: task.order,
        isActive: true,
        externalLessonId: task.externalLessonId,
    }));
}

function normalizeTitle(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const main = async () => {
    const slugs = await resolveCourseSlugsForReconcile();
    const { externalLessons, coursesUsed } = await fetchAllExternalLessons(slugs);

    const publishedFromDb = await loadPublishedCatalogFromDb();
    const publishedCatalog = publishedFromDb ?? loadPublishedCatalogFromCode();
    const catalogSource = publishedFromDb ? "database" : "code";

    const codeMapByLessonId = loadCodeCatalogTaskByLessonId();

    const publishedByLessonId = new Map(
        publishedCatalog
            .filter((task) => task.externalLessonId !== null && task.externalLessonId !== undefined)
            .map((task) => [task.externalLessonId, task]),
    );

    const publishedByTaskId = new Map(publishedCatalog.map((task) => [task.taskId, task]));

    const newInCurseduca = [];
    const titleChanged = [];
    const mappedInJornadaNotInCurseduca = [];
    const unmappedInCurseduca = [];
    const jornadaTasksWithoutLesson = [];

    const externalLessonIds = new Set(externalLessons.map((lesson) => lesson.curseducaId));

    for (const lesson of externalLessons) {
        const published = publishedByLessonId.get(lesson.curseducaId);
        const codeMapped = codeMapByLessonId.get(lesson.curseducaId);

        if (!published && !codeMapped) {
            unmappedInCurseduca.push({
                curseducaId: lesson.curseducaId,
                title: lesson.title,
                moduleTitle: lesson.moduleTitle,
                courseSlug: lesson.courseSlug,
            });
            continue;
        }

        const taskId = published?.taskId ?? codeMapped?.taskId ?? null;
        const referenceTitle = published?.title ?? codeMapped?.title ?? "";

        if (!published && codeMapped) {
            newInCurseduca.push({
                curseducaId: lesson.curseducaId,
                suggestedTaskId: codeMapped.taskId,
                title: lesson.title,
                moduleTitle: lesson.moduleTitle,
                note: "Mapeada no código, ausente no catálogo publicado (DB).",
            });
        }

        if (referenceTitle && normalizeTitle(referenceTitle) !== normalizeTitle(lesson.title)) {
            titleChanged.push({
                taskId,
                curseducaId: lesson.curseducaId,
                publishedTitle: referenceTitle,
                curseducaTitle: lesson.title,
                moduleTitle: lesson.moduleTitle,
            });
        }
    }

    for (const task of publishedCatalog) {
        if (task.externalLessonId && !externalLessonIds.has(task.externalLessonId)) {
            mappedInJornadaNotInCurseduca.push({
                taskId: task.taskId,
                externalLessonId: task.externalLessonId,
                title: task.title,
            });
        }

        if (!task.externalLessonId) {
            jornadaTasksWithoutLesson.push({
                taskId: task.taskId,
                title: task.title,
                stageId: task.stageId,
                order: task.order,
            });
        }
    }

    const report = {
        generatedAt: new Date().toISOString(),
        courses: coursesUsed,
        catalogSource,
        summary: {
            courseCount: coursesUsed.length,
            externalLessons: externalLessons.length,
            publishedTasks: publishedCatalog.length,
            newInCurseduca: newInCurseduca.length,
            titleChanged: titleChanged.length,
            mappedInJornadaNotInCurseduca: mappedInJornadaNotInCurseduca.length,
            unmappedInCurseduca: unmappedInCurseduca.length,
            jornadaTasksWithoutLesson: jornadaTasksWithoutLesson.length,
        },
        diff: {
            newInCurseduca,
            titleChanged,
            mappedInJornadaNotInCurseduca,
            unmappedInCurseduca,
            jornadaTasksWithoutLesson,
        },
        note: "Proposta apenas — nenhuma alteração foi aplicada automaticamente.",
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(JSON.stringify(report.summary, null, 2));
    console.log(`\nRelatório completo: ${outputPath}`);
};

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
