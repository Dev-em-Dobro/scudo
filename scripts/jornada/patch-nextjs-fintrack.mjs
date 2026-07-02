/**
 * Insere Next.js (fundamentos) + Projeto FinTrack AI após Syntax Wear integração.
 * Uso: node --env-file=.env scripts/jornada/patch-nextjs-fintrack.mjs
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const MOCK_PATH = path.join(process.cwd(), "app/lib/jornada/mockJornada.ts");
const MAP_PATH = path.join(process.cwd(), "app/lib/jornada/curseducaLessonTaskMap.ts");

const baseUrl = (process.env.DOBRO_API_BASE_URL ?? "https://dobro-api.vercel.app").replace(/\/$/, "");
const apiKey = (process.env.DOBRO_API_KEY ?? "").trim();

const NEXTJS_SLUG = "em-breve-nextjs-1761674389149";
const FINTRACK_SLUG = "fintrack-ai-dashboard-financeiro-com-nextjs-1774658268942";
const INSERT_AFTER_TASK_ID = "esmeralda-125";
const INSERT_ORDER_START = 112;
const ORDER_BUMP_FROM = 112;
const ORDER_BUMP_BY = 21;

const NEXTJS_TASK_START = 126;
const FINTRACK_TASK_START = 132;

function escapeTitle(value) {
    return value.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function fetchTree(slug) {
    const response = await fetch(`${baseUrl}/api/v1/courses/${encodeURIComponent(slug)}/tree`, {
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body?.message ?? `HTTP ${response.status}`);
    }
    return body;
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
        order: orderMatch ? Number(orderMatch[1]) : null,
        lineIndex: null,
    };
}

function formatTask(task) {
    const kindPart = task.kind ? `kind: '${task.kind}', ` : "";
    return `  { id: '${task.id}', stageId: '${task.stageId}', ${kindPart}title: '${escapeTitle(task.title)}', status: 'pending', order: ${task.order} },`;
}

function buildNewTasks(nextjsTree, fintrackTree) {
    const fundamentals = nextjsTree.modules.find((module) => module.title === "Fundamentos do Next.js");
    if (!fundamentals) {
        throw new Error('Módulo "Fundamentos do Next.js" não encontrado.');
    }

    const fintrackModule = fintrackTree.modules[0];
    if (!fintrackModule?.lessons?.length) {
        throw new Error("Aulas do FinTrack AI não encontradas.");
    }

    const nextjsTasks = [...fundamentals.lessons]
        .sort((a, b) => a.order - b.order)
        .map((lesson, index) => ({
            id: `esmeralda-${NEXTJS_TASK_START + index}`,
            stageId: "s6",
            kind: "aula",
            title: `Next.js - ${lesson.title.trim()}`,
            curseducaId: lesson.curseducaId,
            order: INSERT_ORDER_START + index,
        }));

    const fintrackTasks = [...fintrackModule.lessons]
        .sort((a, b) => a.order - b.order)
        .map((lesson, index) => ({
            id: `esmeralda-${FINTRACK_TASK_START + index}`,
            stageId: "s6",
            kind: "projeto",
            title: `Projeto FinTrack AI - ${lesson.title.trim()}`,
            curseducaId: lesson.curseducaId,
            order: INSERT_ORDER_START + nextjsTasks.length + index,
        }));

    return [...nextjsTasks, ...fintrackTasks];
}

function patchMockJornada(source, newTasks) {
    if (source.includes("esmeralda-126") && source.includes("Next.js - O que é o Next.js")) {
        console.log("mockJornada.ts já contém Next.js/FinTrack — pulando.");
        return source;
    }

    const lines = source.split("\n");
    const parsed = [];
    const lineIndexById = new Map();

    for (let i = 0; i < lines.length; i++) {
        const task = parseTaskLine(lines[i]);
        if (task) {
            task.lineIndex = i;
            parsed.push(task);
            lineIndexById.set(task.id, i);
        }
    }

    const insertAfter = lineIndexById.get(INSERT_AFTER_TASK_ID);
    if (insertAfter === undefined) {
        throw new Error(`Âncora ${INSERT_AFTER_TASK_ID} não encontrada.`);
    }

    const updatedLines = [...lines];

    for (const task of parsed) {
        if (task.stageId === "s6" && task.order !== null && task.order >= ORDER_BUMP_FROM) {
            updatedLines[task.lineIndex] = updatedLines[task.lineIndex].replace(
                /order:\s*\d+/,
                `order: ${task.order + ORDER_BUMP_BY}`,
            );
        }
    }

    const newLines = newTasks.map((task) => formatTask(task));
    updatedLines.splice(insertAfter + 1, 0, ...newLines);

    return updatedLines.join("\n");
}

function patchLessonMap(source, newTasks) {
    if (source.includes('6695: "esmeralda-126"')) {
        console.log("curseducaLessonTaskMap.ts já contém Next.js/FinTrack — pulando.");
        return source;
    }

    const entries = newTasks.map((task) => `    ${task.curseducaId}: "${task.id}",`).join("\n");
    const marker = "export const CURSEDUCA_LESSON_TASK_MAP";
    const mapStart = source.indexOf("{", source.indexOf(marker));
    const insertAt = source.indexOf("\n};", mapStart);

    return `${source.slice(0, insertAt)}\n${entries}${source.slice(insertAt)}`;
}

const [nextjsTree, fintrackTree] = await Promise.all([fetchTree(NEXTJS_SLUG), fetchTree(FINTRACK_SLUG)]);
const newTasks = buildNewTasks(nextjsTree, fintrackTree);

fs.writeFileSync(MOCK_PATH, patchMockJornada(fs.readFileSync(MOCK_PATH, "utf8"), newTasks));
fs.writeFileSync(MAP_PATH, patchLessonMap(fs.readFileSync(MAP_PATH, "utf8"), newTasks));

console.log(
    JSON.stringify(
        {
            inserted: newTasks.length,
            nextjs: newTasks.filter((task) => task.title.startsWith("Next.js -")).length,
            fintrack: newTasks.filter((task) => task.title.startsWith("Projeto FinTrack AI -")).length,
            insertAfter: INSERT_AFTER_TASK_ID,
            orders: `${INSERT_ORDER_START}-${INSERT_ORDER_START + newTasks.length - 1}`,
        },
        null,
        2,
    ),
);
