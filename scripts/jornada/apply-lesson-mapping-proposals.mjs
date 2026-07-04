import fs from "node:fs";
import path from "node:path";

const proposalsPath = path.resolve(
    process.cwd(),
    process.env.JORNADA_LESSON_PROPOSALS ?? "docs/jornada-lesson-mapping-proposals.json",
);
const mapPath = path.resolve(process.cwd(), "app/lib/jornada/curseducaLessonTaskMap.ts");

/** Mapeamentos manuais complementares (aulas novas ou alias por mudança de título). */
const MANUAL_MAPPINGS = [
    { curseducaId: 6781, taskId: "ferro-5", note: "Antigravity CLI (alias de Gemini CLI)" },
    { curseducaId: 6748, taskId: "ferro-45", note: "Aula nova em Primeiros Passos" },
    { curseducaId: 6221, taskId: "ouro-65", note: "Aula nova TypeScript React aliases" },
    { curseducaId: 6171, taskId: "esmeralda-89", note: "Aula nova Prisma" },
    { curseducaId: 6172, taskId: "esmeralda-90", note: "Aula nova Prisma Schema" },
    { curseducaId: 6181, taskId: "esmeralda-91", note: "Aula nova Prisma findFirst" },
    { curseducaId: 6135, taskId: "esmeralda-92", note: "Aula nova Express TS aliases" },
    { curseducaId: 6092, taskId: "platina-36", note: "SQL operadores lógicos parte 2" },
];

function loadExistingMap(source) {
    const map = new Map();

    for (const match of source.matchAll(/(\d+):\s*"([^"]+)"/g)) {
        map.set(Number(match[1]), match[2]);
    }

    return map;
}

const main = () => {
    if (!fs.existsSync(proposalsPath)) {
        throw new Error(`Arquivo não encontrado: ${proposalsPath}`);
    }

    const proposals = JSON.parse(fs.readFileSync(proposalsPath, "utf8"));
    let mapSource = fs.readFileSync(mapPath, "utf8");
    const existing = loadExistingMap(mapSource);

    const candidates = [
        ...(proposals.aliases ?? []),
        ...(proposals.newMappings ?? []),
        ...MANUAL_MAPPINGS,
    ];

    const additions = [];
    let skipped = 0;

    for (const item of candidates) {
        if (existing.has(item.curseducaId)) {
            skipped += 1;
            continue;
        }

        if (additions.some((entry) => entry.curseducaId === item.curseducaId)) {
            continue;
        }

        additions.push(item);
        existing.set(item.curseducaId, item.taskId);
    }

    if (additions.length === 0) {
        console.log(JSON.stringify({ added: 0, skipped, message: "Nada a aplicar." }, null, 2));
        return;
    }

    const block = [
        "    // Aliases e mapeamentos adicionais (Primeiros Passos / IDs novos do backend)",
        ...additions
            .sort((a, b) => a.curseducaId - b.curseducaId)
            .map((item) => `    ${item.curseducaId}: "${item.taskId}",`),
        "",
    ].join("\n");

    mapSource = mapSource.replace(
        "    // Rank Diamante (aulas validadas)",
        `${block}    // Rank Diamante (aulas validadas)`,
    );

    fs.writeFileSync(mapPath, mapSource, "utf8");

    console.log(JSON.stringify({ added: additions.length, skipped, mapPath }, null, 2));
};

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
