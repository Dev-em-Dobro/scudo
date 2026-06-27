import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import { loadCodeCatalogTasks } from "./load-code-catalog.mjs";
import { getDefaultJornadaCourseSlugs } from "../dobro-api/courses-catalog.mjs";

const baseUrl = (process.env.DOBRO_API_BASE_URL ?? "https://dobro-api.vercel.app").replace(/\/$/, "");
const apiKey = (process.env.DOBRO_API_KEY ?? "").trim();
const mapPath = path.resolve(process.cwd(), "app/lib/jornada/curseducaLessonTaskMap.ts");
const trackFilter = process.argv.includes("--main-only");

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

function loadExistingMap() {
    const source = fs.readFileSync(mapPath, "utf8");
    const map = new Map();

    for (const match of source.matchAll(/(\d+):\s*"([^"]+)"/g)) {
        map.set(Number(match[1]), match[2]);
    }

    return map;
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

function scoreMatch(lessonTitle, taskTitle) {
    const a = normalizeTitle(lessonTitle);
    const b = normalizeTitle(taskTitle);

    if (a === b) {
        return 1;
    }

    if (a.includes(b) || b.includes(a)) {
        return 0.9;
    }

    const aTokens = new Set(a.split(" ").filter((t) => t.length > 2));
    const bTokens = new Set(b.split(" ").filter((t) => t.length > 2));
    const intersection = [...aTokens].filter((t) => bTokens.has(t));

    if (intersection.length === 0) {
        return 0;
    }

    return intersection.length / Math.max(aTokens.size, bTokens.size);
}

const main = async () => {
    if (!apiKey) {
        throw new Error("DOBRO_API_KEY ausente.");
    }

    const slugs = trackFilter
        ? getDefaultJornadaCourseSlugs().slice(0, 3)
        : getDefaultJornadaCourseSlugs().filter((slug) =>
              slug.startsWith("primeiros-passos") ||
              slug.startsWith("devquest-20-frontend") ||
              slug.startsWith("devquest-20-backend"),
          );

    const existingMap = loadExistingMap();
    const tasks = loadCodeCatalogTasks();
    const unmappedTasks = tasks.filter((task) => !task.externalLessonId);
    const exerciseTasks = unmappedTasks.filter((task) => /exerc/i.test(task.title));

    const proposals = [];
    const alreadyMapped = [];
    const noMatch = [];

    for (const slug of slugs) {
        const tree = await fetchCourseTree(slug);

        for (const module of tree.modules ?? []) {
            for (const lesson of module.lessons ?? []) {
                if (existingMap.has(lesson.curseducaId)) {
                    continue;
                }

                if (!/exerc/i.test(lesson.title)) {
                    continue;
                }

                let best = null;

                for (const task of exerciseTasks) {
                    const score = scoreMatch(lesson.title, task.title);
                    if (score >= 0.55 && (!best || score > best.score)) {
                        best = { task, score };
                    }
                }

                if (best && best.score >= 0.7) {
                    proposals.push({
                        curseducaId: lesson.curseducaId,
                        taskId: best.task.taskId,
                        score: Number(best.score.toFixed(2)),
                        lessonTitle: lesson.title,
                        taskTitle: best.task.title,
                        courseSlug: tree.slug,
                        moduleTitle: module.title,
                    });
                } else if (best) {
                    noMatch.push({
                        curseducaId: lesson.curseducaId,
                        lessonTitle: lesson.title,
                        courseSlug: tree.slug,
                        bestGuess: best.task.taskId,
                        score: Number(best.score.toFixed(2)),
                    });
                } else {
                    noMatch.push({
                        curseducaId: lesson.curseducaId,
                        lessonTitle: lesson.title,
                        courseSlug: tree.slug,
                        bestGuess: null,
                        score: 0,
                    });
                }
            }
        }
    }

    const usedTaskIds = new Set();
    const uniqueProposals = [];

    for (const item of proposals.sort((a, b) => b.score - a.score)) {
        if (usedTaskIds.has(item.taskId)) {
            continue;
        }
        usedTaskIds.add(item.taskId);
        uniqueProposals.push(item);
    }

    const output = {
        generatedAt: new Date().toISOString(),
        coursesScanned: slugs,
        summary: {
            highConfidenceProposals: uniqueProposals.length,
            needsReview: noMatch.length,
            exerciseTasksWithoutLesson: exerciseTasks.length,
        },
        proposals: uniqueProposals,
        needsReview: noMatch,
    };

    const outPath = path.resolve(process.cwd(), "docs/jornada-exercise-mapping-proposals.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    console.log(JSON.stringify(output.summary, null, 2));
    console.log(`\nPropostas: ${outPath}`);

    if (uniqueProposals.length > 0) {
        console.log("\n--- Alta confiança (aplicar no mapa) ---");
        for (const p of uniqueProposals) {
            console.log(`${p.curseducaId}: "${p.taskId}"  // ${p.lessonTitle.slice(0, 60)}`);
        }
    }
};

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
