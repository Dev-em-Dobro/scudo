/**
 * Marca progresso da jornada para um usuário local (QA antes de prod).
 *
 * Uso:
 *   DATABASE_URL=... JORNADA_SEED_EMAIL=... node scripts/jornada/seed-user-progress.mjs
 *
 * Opções:
 *   JORNADA_SEED_THROUGH_STAGE=s9   — completa até Mestre; Lendário fica editável (default)
 *   JORNADA_SEED_THROUGH_STAGE=s10  — completa tudo incluindo Lendário
 *   JORNADA_SEED_DRY_RUN=1          — só imprime o plano
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import process from "node:process";
import pg from "pg";

const databaseUrl = (
    process.env.DATABASE_URL ??
    process.env.LOCAL_DATABASE_URL ??
    ""
).trim();

const userEmail = (
    process.env.JORNADA_SEED_EMAIL ??
    process.env.SEED_USER_EMAIL ??
    ""
)
    .trim()
    .toLowerCase();

const throughStage = (process.env.JORNADA_SEED_THROUGH_STAGE ?? "s9").trim();
const dryRun = process.env.JORNADA_SEED_DRY_RUN === "1" || process.env.JORNADA_SEED_DRY_RUN === "true";
const catalogVersion = Number(process.env.JORNADA_CATALOG_VERSION ?? "1");

const STAGE_ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
const STAGE_LABEL = {
    s1: "Ferro",
    s2: "Bronze",
    s3: "Prata",
    s4: "Ouro",
    s5: "Platina",
    s6: "Esmeralda",
    s7: "Diamante",
    s8: "Mythril",
    s9: "Mestre",
    s10: "Lendário",
};

if (!databaseUrl) {
    console.error("Defina DATABASE_URL ou LOCAL_DATABASE_URL.");
    process.exit(1);
}

if (!userEmail) {
    console.error("Defina JORNADA_SEED_EMAIL ou SEED_USER_EMAIL.");
    process.exit(1);
}

if (!STAGE_ORDER.includes(throughStage)) {
    console.error(`JORNADA_SEED_THROUGH_STAGE inválido: "${throughStage}". Use s1–s10.`);
    process.exit(1);
}

const throughIndex = STAGE_ORDER.indexOf(throughStage);
const includedStages = new Set(STAGE_ORDER.slice(0, throughIndex + 1));

const client = new pg.Client({ connectionString: databaseUrl });

const main = async () => {
    await client.connect();

    try {
        const userResult = await client.query(
            `
            select id, email, "officialStudentVerifiedAt"
            from "User"
            where lower(email) = lower($1)
            limit 1
            `,
            [userEmail],
        );

        const user = userResult.rows[0];
        if (!user) {
            throw new Error(`Usuário não encontrado: ${userEmail}`);
        }

        const catalogResult = await client.query(`
            select "taskId", "stageId", title, "order"
            from "JornadaCatalogTask"
            where "isActive" = true
            order by "stageId", "order"
        `);

        if (catalogResult.rowCount === 0) {
            throw new Error(
                'Catálogo vazio. Rode FORCE_BOOTSTRAP=1 npm run jornada:bootstrap-catalog:local antes.',
            );
        }

        const tasksToComplete = catalogResult.rows.filter((task) => includedStages.has(task.stageId));
        const stagesToFreeze = STAGE_ORDER.slice(0, throughIndex + 1);

        const plan = {
            email: user.email,
            userId: user.id,
            officialStudent: Boolean(user.officialStudentVerifiedAt),
            throughStage,
            throughRank: STAGE_LABEL[throughStage],
            tasksToMarkDone: tasksToComplete.length,
            stagesToFreeze: stagesToFreeze.map((id) => ({ id, rank: STAGE_LABEL[id] })),
            editableAfter: STAGE_ORDER[throughIndex + 1]
                ? {
                      stageId: STAGE_ORDER[throughIndex + 1],
                      rank: STAGE_LABEL[STAGE_ORDER[throughIndex + 1]],
                  }
                : null,
            dryRun,
        };

        console.log(JSON.stringify(plan, null, 2));

        if (dryRun) {
            return;
        }

        await client.query("BEGIN");

        const now = new Date();
        let insertedTasks = 0;

        for (const task of tasksToComplete) {
            const result = await client.query(
                `
                insert into "UserJornadaTaskProgress" (
                  "id", "userId", "taskId", "completedAt", "createdAt", "updatedAt"
                ) values ($1, $2, $3, $4, $4, $4)
                on conflict ("userId", "taskId") do update
                  set "completedAt" = excluded."completedAt", "updatedAt" = excluded."updatedAt"
                `,
                [randomUUID(), user.id, task.taskId, now],
            );
            if (result.rowCount > 0) {
                insertedTasks += 1;
            }
        }

        let insertedStages = 0;

        for (const stageId of stagesToFreeze) {
            const stageTasks = catalogResult.rows.filter((task) => task.stageId === stageId);
            const allDone = stageTasks.every((task) =>
                tasksToComplete.some((done) => done.taskId === task.taskId),
            );

            if (!allDone || stageTasks.length === 0) {
                continue;
            }

            const result = await client.query(
                `
                insert into "UserJornadaStageCompletion" (
                  "id", "userId", "stageId", "completedAt", "catalogVersionAtCompletion", "createdAt", "updatedAt"
                ) values ($1, $2, $3, $4, $5, $4, $4)
                on conflict ("userId", "stageId") do update
                  set
                    "completedAt" = excluded."completedAt",
                    "catalogVersionAtCompletion" = excluded."catalogVersionAtCompletion",
                    "updatedAt" = excluded."updatedAt"
                `,
                [randomUUID(), user.id, stageId, now, catalogVersion],
            );
            if (result.rowCount > 0) {
                insertedStages += 1;
            }
        }

        await client.query("COMMIT");

        const verify = await client.query(
            `
            select
              (select count(*)::int from "UserJornadaTaskProgress" where "userId" = $1) as task_progress,
              (select count(*)::int from "UserJornadaStageCompletion" where "userId" = $1) as stage_completions
            `,
            [user.id],
        );

        console.log(
            JSON.stringify(
                {
                    ok: true,
                    upsertedTasks: insertedTasks,
                    upsertedStages: insertedStages,
                    totals: verify.rows[0],
                },
                null,
                2,
            ),
        );
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
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
