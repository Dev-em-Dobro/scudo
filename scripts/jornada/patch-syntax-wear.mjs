/**
 * Insere aulas do Projeto Syntax Wear na jornada (uma vez).
 * Uso: node scripts/jornada/patch-syntax-wear.mjs
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MOCK_PATH = path.join(ROOT, "app/lib/jornada/mockJornada.ts");
const MAP_PATH = path.join(ROOT, "app/lib/jornada/mockJornada.ts".replace("mockJornada", "curseducaLessonTaskMap"));

const baseUrl = (process.env.DOBRO_API_BASE_URL ?? "https://dobro-api.vercel.app").replace(/\/$/, "");
const apiKey = (process.env.DOBRO_API_KEY ?? "").trim();

const TITLE_PREFIX = {
    Frontend: "Projeto Syntax Wear - Frontend - ",
    Backend: "Projeto Syntax Wear - Backend - ",
    "Integração Frontend e Backend": "Projeto Syntax Wear - Integração FE e BE - ",
};

const TASK_CONFIG = {
    Frontend: { stageId: "s5", prefix: "platina", startNum: 100, insertAfterTaskId: "platina-68", orderBumpFrom: 17, orderBumpBy: 28 },
    Backend: { stageId: "s6", prefix: "esmeralda", startNum: 94, insertAfterTaskId: "esmeralda-93", orderBumpFrom: 80, orderBumpBy: 32 },
};

function escapeTitle(value) {
    return value.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function fetchTree() {
    const response = await fetch(`${baseUrl}/api/v1/courses/projeto-e-commerce-1764442100039/tree`, {
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body?.message ?? `HTTP ${response.status}`);
    }
    return body;
}

function buildNewTasks(modules) {
    const frontendModule = modules.find((m) => m.title === "Frontend");
    const backendModule = modules.find((m) => m.title === "Backend");
    const integrationModule = modules.find((m) => m.title === "Integração Frontend e Backend");

    if (!frontendModule || !backendModule || !integrationModule) {
        throw new Error("Módulos Frontend/Backend/Integração não encontrados no curso Syntax Wear.");
    }

    const platinaFe = frontendModule.lessons.map((lesson, index) => ({
        id: `platina-${100 + index}`,
        stageId: "s5",
        kind: "projeto",
        title: `${TITLE_PREFIX.Frontend}${lesson.title.trim()}`,
        curseducaId: lesson.curseducaId,
        insertGroup: "frontend",
        orderOffset: index,
    }));

    const esmeraldaBe = backendModule.lessons.map((lesson, index) => ({
        id: `esmeralda-${94 + index}`,
        stageId: "s6",
        kind: "projeto",
        title: `${TITLE_PREFIX.Backend}${lesson.title.trim()}`,
        curseducaId: lesson.curseducaId,
        insertGroup: "backend",
        orderOffset: index,
    }));

    const esmeraldaInt = integrationModule.lessons.map((lesson, index) => ({
        id: `esmeralda-${116 + index}`,
        stageId: "s6",
        kind: "projeto",
        title: `${TITLE_PREFIX["Integração Frontend e Backend"]}${lesson.title.trim()}`,
        curseducaId: lesson.curseducaId,
        insertGroup: "backend",
        orderOffset: backendModule.lessons.length + index,
    }));

    return [...platinaFe, ...esmeraldaBe, ...esmeraldaInt];
}

function parseTaskLine(line) {
    const match = line.match(
        /\{\s*id:\s*'([^']+)',\s*stageId:\s*'([^']+)',(?:\s*kind:\s*'([^']+)',)?\s*title:\s*'((?:\\'|[^'])*)'/,
    );
    if (!match) {
        return null;
    }

    const orderMatch = line.match(/order:\s*(\d+)/);
    return {
        id: match[1],
        stageId: match[2],
        kind: match[3] ?? null,
        title: match[4].replace(/\\'/g, "'"),
        order: orderMatch ? Number(orderMatch[1]) : null,
        raw: line,
    };
}

function formatTask(task) {
    const kindPart = task.kind ? `kind: '${task.kind}', ` : "";
    const descPart = task.description ? `description: '${task.description}', ` : "";
    return `  { id: '${task.id}', stageId: '${task.stageId}', ${kindPart}title: '${escapeTitle(task.title)}', ${descPart}status: 'pending', order: ${task.order} },`;
}

function patchMockJornada(source, newTasks) {
    if (source.includes("platina-100") && source.includes("Projeto Syntax Wear - Frontend -")) {
        console.log("mockJornada.ts já contém Syntax Wear — pulando.");
        return source;
    }

    const lines = source.split("\n");
    const parsed = [];
    const lineIndexById = new Map();

    for (let i = 0; i < lines.length; i++) {
        const task = parseTaskLine(lines[i]);
        if (task) {
            parsed.push({ ...task, lineIndex: i });
            lineIndexById.set(task.id, i);
        }
    }

    const platinaInsertAfter = lineIndexById.get("platina-68");
    const esmeraldaInsertAfter = lineIndexById.get("esmeralda-93");

    if (platinaInsertAfter === undefined || esmeraldaInsertAfter === undefined) {
        throw new Error("Âncoras platina-68 ou esmeralda-93 não encontradas.");
    }

    const platinaInsertOrder = 17;
    const esmeraldaInsertOrder = 80;

    const platinaNewLines = newTasks
        .filter((t) => t.insertGroup === "frontend")
        .map((t) =>
            formatTask({
                id: t.id,
                stageId: t.stageId,
                kind: t.kind,
                title: t.title,
                order: platinaInsertOrder + t.orderOffset,
            }),
        );

    const esmeraldaNewLines = newTasks
        .filter((t) => t.insertGroup === "backend")
        .map((t) =>
            formatTask({
                id: t.id,
                stageId: t.stageId,
                kind: t.kind,
                title: t.title,
                order: esmeraldaInsertOrder + t.orderOffset,
            }),
        );

    const updatedLines = [...lines];

    for (const task of parsed) {
        if (task.stageId === "s5" && task.order !== null && task.order >= 17 && task.id !== "platina-68") {
            const newOrder = task.order + 28;
            updatedLines[task.lineIndex] = updatedLines[task.lineIndex].replace(
                /order:\s*\d+/,
                `order: ${newOrder}`,
            );
        }
        if (task.stageId === "s6" && task.order !== null && task.order >= 80) {
            const newOrder = task.order + 32;
            updatedLines[task.lineIndex] = updatedLines[task.lineIndex].replace(
                /order:\s*\d+/,
                `order: ${newOrder}`,
            );
        }
    }

    updatedLines.splice(platinaInsertAfter + 1, 0, ...platinaNewLines);
    const esmeraldaInsertAfterAdjusted = esmeraldaInsertAfter + platinaNewLines.length;
    updatedLines.splice(esmeraldaInsertAfterAdjusted + 1, 0, ...esmeraldaNewLines);

    return updatedLines.join("\n");
}

function patchLessonMap(source, newTasks) {
    if (source.includes('6506: "platina-100"')) {
        console.log("curseducaLessonTaskMap.ts já contém Syntax Wear — pulando.");
        return source;
    }

    const entries = newTasks.map((t) => `    ${t.curseducaId}: "${t.id}",`).join("\n");
    const marker = "export const CURSEDUCA_LESSON_TASK_MAP";
    const mapStart = source.indexOf("{", source.indexOf(marker));
    const insertAt = source.indexOf("\n};", mapStart);

    return `${source.slice(0, insertAt)}\n${entries}${source.slice(insertAt)}`;
}

const tree = await fetchTree();
const newTasks = buildNewTasks(tree.modules);

fs.writeFileSync(MOCK_PATH, patchMockJornada(fs.readFileSync(MOCK_PATH, "utf8"), newTasks));
fs.writeFileSync(MAP_PATH, patchLessonMap(fs.readFileSync(MAP_PATH, "utf8"), newTasks));

console.log(
    JSON.stringify(
        {
            inserted: newTasks.length,
            frontend: newTasks.filter((t) => t.insertGroup === "frontend").length,
            backend: newTasks.filter((t) => t.insertGroup === "backend").length,
        },
        null,
        2,
    ),
);
