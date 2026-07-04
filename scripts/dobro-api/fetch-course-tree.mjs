import "dotenv/config";
import process from "node:process";

import {
    getCurriculumTracks,
    getDefaultJornadaCourseSlugs,
    getMainTrackRequiredStartSlugs,
    listCoursesCatalog,
    resolveCourseSlugFromCatalog,
} from "./courses-catalog.mjs";

const baseUrl = (process.env.DOBRO_API_BASE_URL ?? "https://dobro-api.vercel.app").replace(/\/$/, "");
const apiKey = (process.env.DOBRO_API_KEY ?? "").trim();
const courseSlugArg = process.argv[2]?.trim();
const listOnly = process.argv.includes("--list");

if (!apiKey && !listOnly) {
    console.error("Defina DOBRO_API_KEY no .env (header x-api-key do gateway).");
    process.exit(1);
}

async function fetchJson(path) {
    const response = await fetch(`${baseUrl}${path}`, {
        headers: {
            "x-api-key": apiKey,
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body?.message ?? `HTTP ${response.status}`;
        throw new Error(`${path}: ${message}`);
    }

    return body;
}

const main = async () => {
    if (listOnly) {
        console.log("Currículo DevQuest (trilhas):\n");

        for (const track of getCurriculumTracks()) {
            console.log(`[${track.order}] ${track.title} (${track.orderConstraint})`);
            if (track.requiredStartSlugs?.length) {
                console.log(`    início obrigatório: ${track.requiredStartSlugs.join(" → ")}`);
            }
            for (const slug of track.slugs) {
                console.log(`    - ${slug}`);
            }
            console.log("");
        }

        const catalogOnly = listCoursesCatalog().filter((course) => !course.inJornadaBoard);
        console.log(`Fora do currículo (${catalogOnly.length} curso(s)) — não entram no reconcile.\n`);
        for (const course of catalogOnly.slice(0, 8)) {
            console.log(`  ${course.slug}`);
        }
        if (catalogOnly.length > 8) {
            console.log(`  ... e mais ${catalogOnly.length - 8}`);
        }

        console.log(`\nEntrada do aluno: ${resolveCourseSlugFromCatalog()}`);
        console.log(`Início obrigatório: ${getMainTrackRequiredStartSlugs().join(" → ")}`);
        console.log(`Total no reconcile: ${getDefaultJornadaCourseSlugs().length} curso(s)`);
        return;
    }

    const slug = resolveCourseSlugFromCatalog(courseSlugArg || process.env.DOBRO_API_COURSE_SLUG);
    const tree = await fetchJson(`/api/v1/courses/${encodeURIComponent(slug)}/tree`);

    const modules = tree.modules ?? [];
    const lessonCount = modules.reduce((sum, module) => sum + (module.lessons?.length ?? 0), 0);

    console.log("\n--- Resumo ---");
    console.log(`Curso: ${tree.title} (${tree.slug})`);
    console.log(`Módulos: ${modules.length}`);
    console.log(`Aulas: ${lessonCount}`);

    if (modules.length > 0) {
        const firstModule = modules[0];
        const firstLesson = firstModule.lessons?.[0];
        console.log("\nPrimeiro módulo:", firstModule.title);
        if (firstLesson) {
            console.log("Primeira aula:", firstLesson.title, `(curseducaId=${firstLesson.curseducaId})`);
        }
    }

    if (process.env.DOBRO_API_TREE_JSON === "1") {
        console.log(JSON.stringify(tree, null, 2));
    }
};

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
