import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import { loadCodeCatalogTasks } from "./load-code-catalog.mjs";
import { getDefaultJornadaCourseSlugs } from "../dobro-api/courses-catalog.mjs";

const baseUrl = (process.env.DOBRO_API_BASE_URL ?? "https://dobro-api.vercel.app").replace(/\/$/, "");
const apiKey = (process.env.DOBRO_API_KEY ?? "").trim();
const mapPath = path.resolve(process.cwd(), "app/lib/jornada/curseducaLessonTaskMap.ts");
const mainOnly = process.argv.includes("--main-only");

function normalizeTitle(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/exercicios?/g, "exercicio")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function scoreMatch(lessonTitle, taskTitle) {
    const a = normalizeTitle(lessonTitle);
    const b = normalizeTitle(taskTitle);

    if (a === b) {
        return 1;
    }

    if (a.includes(b) || b.includes(a)) {
        return 0.92;
    }

    const aTokens = new Set(a.split(" ").filter((token) => token.length > 2));
    const bTokens = new Set(b.split(" ").filter((token) => token.length > 2));
    const intersection = [...aTokens].filter((token) => bTokens.has(token));

    if (intersection.length === 0) {
        return 0;
    }

    return intersection.length / Math.max(aTokens.size, bTokens.size);
}

function loadExistingLessonIds() {
    const source = fs.readFileSync(mapPath, "utf8");
    return new Set([...source.matchAll(/(\d+):/g)].map((match) => Number(match[1])));
}

function stagesForCourseSlug(slug) {
    if (slug.startsWith("primeiros-passos")) {
        return ["s1"];
    }

    if (slug.includes("frontend")) {
        return ["s1", "s2", "s3", "s4"];
    }

    if (slug.includes("backend")) {
        return ["s5", "s6"];
    }

    return null;
}

async function fetchCourseTree(slug) {
    const response = await fetch(`${baseUrl}/api/v1/courses/${encodeURIComponent(slug)}/tree`, {
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
    });

    const body = await response.json();
    if (!response.ok) {
        throw new Error(body?.message ?? `HTTP ${response.status} (${slug})`);
    }

    return body;
}

const main = async () => {
    if (!apiKey) {
        throw new Error("DOBRO_API_KEY ausente.");
    }

    const slugs = mainOnly
        ? getDefaultJornadaCourseSlugs().slice(0, 3)
        : getDefaultJornadaCourseSlugs().filter(
              (slug) =>
                  slug.startsWith("primeiros-passos") ||
                  slug.startsWith("devquest-20-frontend") ||
                  slug.startsWith("devquest-20-backend"),
          );

    const existingLessonIds = loadExistingLessonIds();
    const allTasks = loadCodeCatalogTasks().filter((task) => !/exerc/i.test(task.title));

    const aliases = [];
    const newMappings = [];
    const review = [];
    const noMatch = [];

    for (const slug of slugs) {
        const tree = await fetchCourseTree(slug);
        const allowedStages = stagesForCourseSlug(slug);

        for (const module of tree.modules ?? []) {
            for (const lesson of module.lessons ?? []) {
                if (/exerc/i.test(lesson.title)) {
                    continue;
                }

                if (existingLessonIds.has(lesson.curseducaId)) {
                    continue;
                }

                const candidates = allTasks.filter((task) => {
                    if (!allowedStages) {
                        return true;
                    }

                    return allowedStages.includes(task.stageId);
                });

                let best = null;

                for (const task of candidates) {
                    const score = scoreMatch(lesson.title, task.title);
                    if (score >= 0.55 && (!best || score > best.score)) {
                        best = {
                            taskId: task.taskId,
                            taskTitle: task.title,
                            score,
                            mappedTaskHasLesson: Boolean(task.externalLessonId),
                        };
                    }
                }

                const item = {
                    curseducaId: lesson.curseducaId,
                    lessonTitle: lesson.title,
                    moduleTitle: module.title,
                    courseSlug: slug,
                    score: best ? Number(best.score.toFixed(2)) : 0,
                    taskId: best?.taskId ?? null,
                    taskTitle: best?.taskTitle ?? null,
                    mappedTaskHasLesson: best?.mappedTaskHasLesson ?? false,
                };

                if (!best) {
                    noMatch.push(item);
                } else if (best.score >= 0.85) {
                    if (best.mappedTaskHasLesson) {
                        aliases.push({ ...item, type: "alias" });
                    } else {
                        newMappings.push({ ...item, type: "new_mapping" });
                    }
                } else {
                    review.push(item);
                }
            }
        }
    }

    const usedTaskIds = new Set();
    const uniqueNewMappings = [];

    for (const item of newMappings.sort((a, b) => b.score - a.score)) {
        if (usedTaskIds.has(item.taskId)) {
            review.push({ ...item, note: "Conflito: taskId já proposto para outra aula." });
            continue;
        }

        usedTaskIds.add(item.taskId);
        uniqueNewMappings.push(item);
    }

    const output = {
        generatedAt: new Date().toISOString(),
        coursesScanned: slugs,
        summary: {
            aliases: aliases.length,
            newMappings: uniqueNewMappings.length,
            review: review.length,
            noMatch: noMatch.length,
        },
        aliases,
        newMappings: uniqueNewMappings,
        review,
        noMatch,
    };

    const outPath = path.resolve(process.cwd(), "docs/jornada-lesson-mapping-proposals.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    console.log(JSON.stringify(output.summary, null, 2));
    console.log(`\nPropostas: ${outPath}`);
};

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
