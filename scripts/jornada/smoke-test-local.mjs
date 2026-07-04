/**
 * Smoke test local: catálogo publicado + proteção de rank.
 * Uso: DATABASE_URL=... node scripts/jornada/smoke-test-local.mjs
 */
import pg from "pg";

import { loadCodeCatalogTasks } from "./load-code-catalog.mjs";

const databaseUrl = (
    process.env.DATABASE_URL ??
    process.env.LOCAL_DATABASE_URL ??
    ""
).trim();

if (!databaseUrl) {
    console.error("Defina DATABASE_URL ou LOCAL_DATABASE_URL.");
    process.exit(1);
}

const STAGES = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
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

function computeEditableStageId(catalogTasks, completedTaskIds, completedStageIds) {
    for (const stageId of STAGES) {
        if (completedStageIds.has(stageId)) {
            continue;
        }

        const stageTasks = catalogTasks.filter((task) => task.stageId === stageId);
        const hasPending = stageTasks.some((task) => !completedTaskIds.has(task.taskId));

        if (hasPending) {
            return stageId;
        }
    }

    return STAGES.at(-1) ?? "";
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
    await client.connect();

    const catalogCount = await client.query(`
        select count(*)::int as total, count("externalLessonId")::int as mapped
        from "JornadaCatalogTask"
        where "isActive" = true
    `);

    const codeTasks = loadCodeCatalogTasks();
    const dbTasks = await client.query(`
        select "taskId", "stageId", "title", "order", "externalLessonId", "catalogVersion"
        from "JornadaCatalogTask"
        where "isActive" = true
        order by "stageId", "order"
    `);

    const users = await client.query(`
        select
          u.id,
          u.email,
          count(p."taskId")::int as progress_count
        from "User" u
        left join "UserJornadaTaskProgress" p on p."userId" = u.id
        where u."officialStudentVerifiedAt" is not null
        group by u.id, u.email
        order by progress_count desc
        limit 1
    `);

    console.log("=== Catálogo publicado ===");
    console.log(
        JSON.stringify(
            {
                source: dbTasks.rowCount > 0 ? "database" : "code (fallback)",
                dbTasks: catalogCount.rows[0]?.total ?? 0,
                codeTasks: codeTasks.length,
                mappedLessons: catalogCount.rows[0]?.mapped ?? 0,
                inSync: dbTasks.rowCount === codeTasks.length,
            },
            null,
            2,
        ),
    );

    if (users.rowCount === 0) {
        console.log("\nNenhum aluno oficial no banco — pule teste de rank.");
        process.exit(0);
    }

    const user = users.rows[0];
    const progress = await client.query(
        `select "taskId" from "UserJornadaTaskProgress" where "userId" = $1`,
        [user.id],
    );
    const completedTaskIds = new Set(progress.rows.map((row) => row.taskId));

    const stageCompletions = await client.query(
        `select "stageId" from "UserJornadaStageCompletion" where "userId" = $1`,
        [user.id],
    );
    const completedStageIds = new Set(stageCompletions.rows.map((row) => row.stageId));

    const editableNow = computeEditableStageId(
        dbTasks.rows,
        completedTaskIds,
        completedStageIds,
    );

    console.log("\n=== Usuário real ===");
    console.log(
        JSON.stringify(
            {
                email: user.email,
                progressCount: completedTaskIds.size,
                completedStageIds: [...completedStageIds],
                editableStageId: editableNow,
                editableRank: STAGE_LABEL[editableNow] ?? editableNow,
            },
            null,
            2,
        ),
    );

    // Cenário: aluno concluiu Ferro (44 tarefas) antes de ferro-45 existir
    const ferroTasks = dbTasks.rows.filter((task) => task.stageId === "s1");
    const ferro45 = ferroTasks.find((task) => task.taskId === "ferro-45");
    const ferroBeforeNewTask = ferroTasks.filter((task) => task.taskId !== "ferro-45");
    const completedBeforeNewTask = new Set(
        ferroBeforeNewTask.map((task) => task.taskId),
    );

    const editableWithoutSnapshot = computeEditableStageId(
        dbTasks.rows,
        completedBeforeNewTask,
        new Set(),
    );
    const editableWithSnapshot = computeEditableStageId(
        dbTasks.rows,
        completedBeforeNewTask,
        new Set(["s1"]),
    );

    console.log("\n=== Simulação: Ferro concluído antes de ferro-45 existir ===");
    console.log(
        JSON.stringify(
            {
                newTask: ferro45
                    ? { taskId: ferro45.taskId, title: ferro45.title }
                    : null,
                ferroTasksBeforeNew: ferroBeforeNewTask.length,
                allOldFerroDone: ferroBeforeNewTask.every((task) =>
                    completedBeforeNewTask.has(task.taskId),
                ),
                ferro45Pending: !completedBeforeNewTask.has("ferro-45"),
                editableWithoutSnapshot,
                editableWithSnapshot,
                rankWithoutSnapshot: STAGE_LABEL[editableWithoutSnapshot],
                rankWithSnapshot: STAGE_LABEL[editableWithSnapshot],
                protectedFromRegression:
                    editableWithoutSnapshot === "s1" && editableWithSnapshot === "s2",
            },
            null,
            2,
        ),
    );

    console.log("\n✓ Smoke test concluído.");
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
} finally {
    await client.end().catch(() => undefined);
}
