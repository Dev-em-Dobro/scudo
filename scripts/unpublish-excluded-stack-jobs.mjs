/**
 * Define publishedAt = null em vagas cuja stack contém tags excluídas do board (ex.: python, c).
 * Uso: npm run jobs:unpublish-excluded
 * Requer DATABASE_URL (ex.: via .env na raiz do projeto).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Alinhado a JOB_LISTING_EXCLUDED_STACK_WHERE em app/lib/jobs/jobBoard.ts */
const EXCLUDED_CANONICAL = new Set(["python", "c"]);

function loadEnvFromDotenv() {
    const envPath = join(__dirname, "..", ".env");
    if (!existsSync(envPath)) {
        return;
    }
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const eq = trimmed.indexOf("=");
        if (eq === -1) {
            continue;
        }
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
}

function stackHasExcludedTag(stack) {
    if (!Array.isArray(stack)) {
        return false;
    }
    return stack.some((s) => EXCLUDED_CANONICAL.has(String(s).toLowerCase().trim()));
}

async function main() {
    loadEnvFromDotenv();
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL não definida. Configure .env ou exporte a variável.");
        process.exit(1);
    }

    const prisma = new PrismaClient();
    try {
        const jobs = await prisma.job.findMany({
            select: { id: true, stack: true, title: true, companyName: true, publishedAt: true },
        });

        const toUnpublish = jobs.filter((j) => stackHasExcludedTag(j.stack));
        const ids = toUnpublish.map((j) => j.id);

        if (ids.length === 0) {
            console.log("Nenhuma vaga com tags excluídas (python/c) na stack encontrada.");
            return;
        }

        const alreadyNull = toUnpublish.filter((j) => j.publishedAt === null).length;

        const result = await prisma.job.updateMany({
            where: { id: { in: ids } },
            data: { publishedAt: null },
        });

        console.log(
            `Vagas com python ou C na stack: ${ids.length} (já sem publishedAt: ${alreadyNull}). Atualizadas: ${result.count}.`,
        );
        for (const j of toUnpublish.slice(0, 20)) {
            console.log(` - ${j.id} | ${j.companyName} | ${j.title}`);
        }
        if (toUnpublish.length > 20) {
            console.log(` ... e mais ${toUnpublish.length - 20} vagas.`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
