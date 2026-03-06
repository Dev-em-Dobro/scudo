import type { JobLevel } from "@prisma/client";

const levelMap: Array<{ regex: RegExp; level: JobLevel }> = [
    { regex: /estag|intern/i, level: "ESTAGIO" },
    { regex: /junior|júnior|jr\b/i, level: "JUNIOR" },
    { regex: /pleno|mid|middle/i, level: "PLENO" },
    { regex: /senior|sênior|sr\b/i, level: "SENIOR" },
];

export function normalizeLevel(input?: string | null): JobLevel {
    if (!input) {
        return "OUTRO";
    }

    const match = levelMap.find((item) => item.regex.test(input));
    return match?.level ?? "OUTRO";
}

export function normalizeStack(input: string[] | string | null | undefined): string[] {
    let values: string[] = [];

    if (Array.isArray(input)) {
        values = input;
    } else if (input) {
        values = input.split(",");
    }

    return [...new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

export function normalizeLocation(input?: string | null) {
    if (!input) {
        return { location: null, isRemote: false };
    }

    const value = input.trim();
    const isRemote = /remote|remoto|home\s?office|anywhere/i.test(value);

    return {
        location: value,
        isRemote,
    };
}

/**
 * Tenta extrair keywords de tecnologia do título da vaga quando o campo `stack` está vazio.
 * Retorna os termos encontrados no mesmo formato normalizado usado pelo stack.
 */
const TITLE_TECH_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
    { regex: /\bjavascript\b/i, canonical: 'javascript' },
    { regex: /\btypescript\b/i, canonical: 'typescript' },
    { regex: /\bpython\b/i, canonical: 'python' },
    { regex: /\bjava\b/i, canonical: 'java' },
    { regex: /\bkotlin\b/i, canonical: 'kotlin' },
    { regex: /\bswift\b/i, canonical: 'swift' },
    { regex: /\bgolang\b/i, canonical: 'golang' },
    { regex: /\brust\b/i, canonical: 'rust' },
    { regex: /\bruby\b/i, canonical: 'ruby' },
    { regex: /\bphp\b/i, canonical: 'php' },
    { regex: /\bscala\b/i, canonical: 'scala' },
    { regex: /\belixir\b/i, canonical: 'elixir' },
    { regex: /\breact\b/i, canonical: 'react' },
    { regex: /\bvue\.?js\b|\bvue\b/i, canonical: 'vue' },
    { regex: /\bangular\b/i, canonical: 'angular' },
    { regex: /\bsvelte\b/i, canonical: 'svelte' },
    { regex: /\bnext\.?js\b|\bnextjs\b/i, canonical: 'next' },
    { regex: /\bnuxt\.?js\b|\bnuxtjs\b/i, canonical: 'nuxt' },
    { regex: /\bnode\.?js\b|\bnodejs\b|\bnode\b/i, canonical: 'node' },
    { regex: /\bexpress\.?js\b|\bexpress\b/i, canonical: 'express' },
    { regex: /\bnest\.?js\b|\bnestjs\b/i, canonical: 'nestjs' },
    { regex: /\bfastapi\b/i, canonical: 'fastapi' },
    { regex: /\bdjango\b/i, canonical: 'django' },
    { regex: /\bflask\b/i, canonical: 'flask' },
    { regex: /\bspring\b/i, canonical: 'spring' },
    { regex: /\blaravel\b/i, canonical: 'laravel' },
    { regex: /\brails\b|\bruby on rails\b/i, canonical: 'rails' },
    { regex: /\bfullstack\b|\bfull[\s-]stack\b/i, canonical: 'fullstack' },
    { regex: /\bfrontend\b|\bfront[\s-]end\b/i, canonical: 'frontend' },
    { regex: /\bbackend\b|\bback[\s-]end\b/i, canonical: 'backend' },
    { regex: /\bmobile\b/i, canonical: 'mobile' },
    { regex: /\bios\b/i, canonical: 'ios' },
    { regex: /\bandroid\b/i, canonical: 'android' },
    { regex: /\bdevops\b/i, canonical: 'devops' },
    { regex: /\bdocker\b/i, canonical: 'docker' },
    { regex: /\bkubernetes\b|\bk8s\b/i, canonical: 'kubernetes' },
    { regex: /\baws\b/i, canonical: 'aws' },
    { regex: /\bazure\b/i, canonical: 'azure' },
    { regex: /\bgcp\b|\bgoogle cloud\b/i, canonical: 'gcp' },
    { regex: /\bpostgres(?:ql)?\b/i, canonical: 'postgres' },
    { regex: /\bmysql\b/i, canonical: 'mysql' },
    { regex: /\bmongodb\b/i, canonical: 'mongodb' },
    { regex: /\bredis\b/i, canonical: 'redis' },
    { regex: /\bgraphql\b/i, canonical: 'graphql' },
];

export function inferStackFromTitle(title: string): string[] {
    const found: string[] = [];

    for (const { regex, canonical } of TITLE_TECH_PATTERNS) {
        if (regex.test(title) && !found.includes(canonical)) {
            found.push(canonical);
        }
    }

    return found;
}
