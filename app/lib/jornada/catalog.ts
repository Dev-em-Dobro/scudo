import { prisma } from '@/app/lib/prisma';
import type { JornadaStage, JornadaTask, JornadaTaskKind } from '@/app/types';

import { MOCK_STAGES, MOCK_TASKS } from '@/app/lib/jornada/mockJornada';

export type JornadaCatalogSource = 'database' | 'code';

export type PublishedJornadaCatalog = {
    stages: JornadaStage[];
    tasks: JornadaTask[];
    catalogVersion: number;
    source: JornadaCatalogSource;
};

const VALID_KINDS = new Set<JornadaTaskKind>([
    'aula',
    'projeto',
    'desafio',
    'conceito',
    'pratica',
    'entrega',
    'extra',
]);

let cachedCatalog: PublishedJornadaCatalog | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

function mapDbRowToTask(row: {
    taskId: string;
    stageId: string;
    kind: string | null;
    title: string;
    description: string | null;
    order: number;
}): JornadaTask {
    return {
        id: row.taskId,
        stageId: row.stageId,
        title: row.title,
        description: row.description ?? undefined,
        kind: row.kind && VALID_KINDS.has(row.kind as JornadaTaskKind)
            ? (row.kind as JornadaTaskKind)
            : undefined,
        status: 'pending',
        order: row.order,
    };
}

function getCodeCatalog(): PublishedJornadaCatalog {
    return {
        stages: MOCK_STAGES,
        tasks: MOCK_TASKS,
        catalogVersion: 1,
        source: 'code',
    };
}

async function loadCatalogFromDatabase(): Promise<PublishedJornadaCatalog | null> {
    const rows = await prisma.jornadaCatalogTask.findMany({
        where: { isActive: true },
        orderBy: [{ stageId: 'asc' }, { order: 'asc' }],
        select: {
            taskId: true,
            stageId: true,
            kind: true,
            title: true,
            description: true,
            order: true,
            catalogVersion: true,
        },
    });

    if (rows.length === 0) {
        return null;
    }

    const catalogVersion = Math.max(...rows.map((row) => row.catalogVersion));

    return {
        stages: MOCK_STAGES,
        tasks: rows.map(mapDbRowToTask),
        catalogVersion,
        source: 'database',
    };
}

/**
 * Catálogo publicado da jornada.
 * Usa `JornadaCatalogTask` quando houver linhas ativas; senão fallback para mockJornada.ts.
 */
export async function getPublishedJornadaCatalog(options?: {
    bypassCache?: boolean;
}): Promise<PublishedJornadaCatalog> {
    const forceCode =
        process.env.JORNADA_CATALOG_SOURCE === 'code' ||
        process.env.JORNADA_USE_PUBLISHED_CATALOG === 'false';

    if (forceCode) {
        return getCodeCatalog();
    }

    const now = Date.now();
    if (!options?.bypassCache && cachedCatalog && now - cachedAt < CACHE_TTL_MS) {
        return cachedCatalog;
    }

    try {
        const fromDb = await loadCatalogFromDatabase();
        if (fromDb) {
            cachedCatalog = fromDb;
            cachedAt = now;
            return fromDb;
        }
    } catch (error) {
        console.warn(
            '[jornada-catalog] Falha ao ler JornadaCatalogTask — usando fallback do código.',
            error instanceof Error ? error.message : String(error),
        );
    }

    const fallback = getCodeCatalog();
    cachedCatalog = fallback;
    cachedAt = now;
    return fallback;
}

export function buildPraticaTaskIds(tasks: JornadaTask[]): Set<string> {
    return new Set(
        tasks
            .filter((task) => {
                if (task.kind) {
                    return task.kind === 'pratica';
                }

                return task.title.toLowerCase().includes('exercício');
            })
            .map((task) => task.id),
    );
}

export function getCatalogTaskByIdFromTasks(tasks: JornadaTask[], taskId: string) {
    return tasks.find((task) => task.id === taskId) ?? null;
}
