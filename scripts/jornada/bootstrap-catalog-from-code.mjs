import "dotenv/config";
import { randomUUID } from "node:crypto";
import process from "node:process";
import pg from "pg";

import { loadCodeCatalogTasks } from "./load-code-catalog.mjs";

const databaseUrl =
    (process.env.CATALOG_DATABASE_URL ?? process.env.LOCAL_DATABASE_URL ?? "").trim();
const catalogVersion = Number(process.env.JORNADA_CATALOG_VERSION ?? "1");
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

if (!databaseUrl) {
    console.error("Defina CATALOG_DATABASE_URL, LOCAL_DATABASE_URL ou DATABASE_URL.");
    process.exit(1);
}

if (!Number.isInteger(catalogVersion) || catalogVersion < 1) {
    console.error("JORNADA_CATALOG_VERSION deve ser um inteiro >= 1.");
    process.exit(1);
}

const VALID_KINDS = new Set([
    "aula",
    "projeto",
    "desafio",
    "conceito",
    "pratica",
    "entrega",
    "extra",
]);

const client = new pg.Client({ connectionString: databaseUrl });

const main = async () => {
    const tasks = loadCodeCatalogTasks();

    if (tasks.length === 0) {
        throw new Error("Nenhuma tarefa encontrada em mockJornada.ts — revise o parser.");
    }

    await client.connect();

    try {
        const existing = await client.query(`select count(*)::int as count from "JornadaCatalogTask"`);
        const existingCount = existing.rows[0]?.count ?? 0;

        if (existingCount > 0 && process.env.FORCE_BOOTSTRAP !== "1") {
            console.log(
                `Tabela já possui ${existingCount} tarefa(s). Use FORCE_BOOTSTRAP=1 para sobrescrever via upsert.`,
            );
            return;
        }

        let upserted = 0;

        for (const task of tasks) {
            const kind = task.kind && VALID_KINDS.has(task.kind) ? task.kind : null;

            if (dryRun) {
                upserted += 1;
                continue;
            }

            await client.query(
                `
                insert into "JornadaCatalogTask" (
                  "id",
                  "taskId",
                  "stageId",
                  "kind",
                  "title",
                  "description",
                  "order",
                  "isActive",
                  "catalogVersion",
                  "externalLessonId",
                  "updatedAt"
                ) values (
                  $1, $2, $3, $4::"JornadaCatalogTaskKind", $5, $6, $7, true, $8, $9, now()
                )
                on conflict ("taskId") do update set
                  "stageId" = excluded."stageId",
                  "kind" = excluded."kind",
                  "title" = excluded."title",
                  "description" = excluded."description",
                  "order" = excluded."order",
                  "catalogVersion" = excluded."catalogVersion",
                  "externalLessonId" = excluded."externalLessonId",
                  "updatedAt" = now()
                `,
                [
                    randomUUID(),
                    task.taskId,
                    task.stageId,
                    kind,
                    task.title,
                    task.description,
                    task.order,
                    catalogVersion,
                    task.externalLessonId,
                ],
            );

            upserted += 1;
        }

        console.log(
            JSON.stringify(
                {
                    dryRun,
                    catalogVersion,
                    tasksFromCode: tasks.length,
                    upserted,
                    mappedLessons: tasks.filter((task) => task.externalLessonId !== null).length,
                },
                null,
                2,
            ),
        );
    } finally {
        await client.end();
    }
};

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
