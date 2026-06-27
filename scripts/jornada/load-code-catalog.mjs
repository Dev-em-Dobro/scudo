import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function parseMockTasks(source) {
    const tasks = [];
    const blockPattern =
        /\{\s*id:\s*'([^']+)',\s*stageId:\s*'([^']+)',([\s\S]*?)\s*order:\s*(\d+)\s*\}/g;

    for (const match of source.matchAll(blockPattern)) {
        const inner = match[3];
        const kind = inner.match(/kind:\s*'([^']+)'/)?.[1] ?? null;
        const title =
            inner.match(/title:\s*'((?:\\'|[^'])*)'/)?.[1]?.replace(/\\'/g, "'") ?? "";
        const description =
            inner.match(/description:\s*'((?:\\'|[^'])*)'/)?.[1]?.replace(/\\'/g, "'") ??
            null;

        tasks.push({
            taskId: match[1],
            stageId: match[2],
            kind,
            title,
            description,
            order: Number(match[4]),
        });
    }

    return tasks;
}

function parseCurseducaLessonTaskMap(source) {
    const map = new Map();

    for (const match of source.matchAll(/(\d+):\s*"([^"]+)"/g)) {
        map.set(Number(match[1]), match[2]);
    }

    return map;
}

export function loadCodeCatalogTasks() {
    const mockSource = readProjectFile("app/lib/jornada/mockJornada.ts");
    const mapSource = readProjectFile("app/lib/jornada/curseducaLessonTaskMap.ts");

    const tasks = parseMockTasks(mockSource);
    const lessonIdByTaskId = parseCurseducaLessonTaskMap(mapSource);

    const taskIdByLessonId = new Map();
    for (const [lessonId, taskId] of lessonIdByTaskId.entries()) {
        taskIdByLessonId.set(taskId, lessonId);
    }

    return tasks.map((task) => ({
        ...task,
        externalLessonId: taskIdByLessonId.get(task.taskId) ?? null,
    }));
}

export function loadCodeCatalogTaskByLessonId() {
    const mapSource = readProjectFile("app/lib/jornada/curseducaLessonTaskMap.ts");
    const lessonIdByTaskId = parseCurseducaLessonTaskMap(mapSource);
    const taskById = new Map(loadCodeCatalogTasks().map((task) => [task.taskId, task]));

    const byLessonId = new Map();
    for (const [lessonId, taskId] of lessonIdByTaskId.entries()) {
        byLessonId.set(lessonId, taskById.get(taskId) ?? { taskId, externalLessonId: lessonId });
    }

    return byLessonId;
}
