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

const TITLE_TECH_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
    // Languages
    { regex: /\bjavascript\b/i, canonical: 'javascript' },
    { regex: /\btypescript\b/i, canonical: 'typescript' },
    { regex: /\bpython\b/i, canonical: 'python' },
    { regex: /\bjava\b/i, canonical: 'java' },
    { regex: /\bkotlin\b/i, canonical: 'kotlin' },
    { regex: /(^|[^a-z0-9])c\+\+([^a-z0-9]|$)|\bcpp\b/i, canonical: 'c++' },
    { regex: /\bswift\b/i, canonical: 'swift' },
    { regex: /\bgolang\b/i, canonical: 'golang' },
    { regex: /\brust\b/i, canonical: 'rust' },
    { regex: /\bruby\b/i, canonical: 'ruby' },
    { regex: /\bphp\b/i, canonical: 'php' },
    { regex: /\bscala\b/i, canonical: 'scala' },
    { regex: /\belixir\b/i, canonical: 'elixir' },
    { regex: /\bc\b/i, canonical: 'c' },
    { regex: /\bc#\b|csharp/i, canonical: 'c#' },
    { regex: /\bf#\b|fsharp/i, canonical: 'f#' },
    { regex: /\br\b/i, canonical: 'r' },
    { regex: /\bmatlab\b/i, canonical: 'matlab' },
    { regex: /\bperl\b/i, canonical: 'perl' },
    { regex: /\bhaskell\b/i, canonical: 'haskell' },
    { regex: /\bclojure\b/i, canonical: 'clojure' },
    { regex: /\berlang\b/i, canonical: 'erlang' },
    { regex: /\bdart\b/i, canonical: 'dart' },
    { regex: /\bobjective-c\b|\bobjc\b/i, canonical: 'objective-c' },
    { regex: /\bpowershell\b/i, canonical: 'powershell' },
    { regex: /\bterraform\b|\btf\b/i, canonical: 'terraform' },
    // Frontend frameworks/libraries
    { regex: /\breact\b/i, canonical: 'react' },
    { regex: /\breact native\b/i, canonical: 'react-native' },
    { regex: /\bredux\b/i, canonical: 'redux' },
    { regex: /\bzustand\b/i, canonical: 'zustand' },
    { regex: /\bmobx\b/i, canonical: 'mobx' },
    { regex: /\bchakra ui\b/i, canonical: 'chakra-ui' },
    { regex: /\bmaterial ui\b|\bmui\b/i, canonical: 'mui' },
    { regex: /\bfigma\b/i, canonical: 'figma' },
    { regex: /\badobe xd\b/i, canonical: 'adobe-xd' },
    { regex: /\bphotoshop\b/i, canonical: 'photoshop' },
    { regex: /\bshadcn\b/i, canonical: 'shadcn-ui' },
    { regex: /\bstorybook\b/i, canonical: 'storybook' },
    { regex: /\bvue\.?js\b|\bvue\b/i, canonical: 'vue' },
    { regex: /\bangular\b/i, canonical: 'angular' },
    { regex: /\bsvelte\b/i, canonical: 'svelte' },
    { regex: /\bnext\.?js\b|\bnextjs\b/i, canonical: 'next' },
    { regex: /\bnuxt\.?js\b|\bnuxtjs\b/i, canonical: 'nuxt' },
    { regex: /\bastro\b/i, canonical: 'astro' },
    { regex: /\bvite\b/i, canonical: 'vite' },
    // Backend frameworks
    { regex: /\bnode\.?js\b|\bnodejs\b|\bnode\b/i, canonical: 'node' },
    { regex: /\bexpress\.?js\b|\bexpress\b/i, canonical: 'express' },
    { regex: /\bnest\.?js\b|\bnestjs\b/i, canonical: 'nestjs' },
    { regex: /\bfastapi\b/i, canonical: 'fastapi' },
    { regex: /\bfastify\b/i, canonical: 'fastify' },
    { regex: /\badonis(?:js)?\b/i, canonical: 'adonisjs' },
    { regex: /\bdjango\b/i, canonical: 'django' },
    { regex: /\bflask\b/i, canonical: 'flask' },
    { regex: /\bpyramid\b/i, canonical: 'pyramid' },
    { regex: /\bspring\b/i, canonical: 'spring' },
    { regex: /\bmicronaut\b/i, canonical: 'micronaut' },
    { regex: /\blaravel\b/i, canonical: 'laravel' },
    { regex: /\bsymfony\b/i, canonical: 'symfony' },
    { regex: /\bcodeigniter\b/i, canonical: 'codeigniter' },
    { regex: /\brails\b|\bruby on rails\b/i, canonical: 'rails' },
    { regex: /\bsinatra\b/i, canonical: 'sinatra' },
    { regex: /\bphoenix\b/i, canonical: 'phoenix' },
    { regex: /\bgin\b/i, canonical: 'gin' },
    { regex: /\becho\b/i, canonical: 'echo' },
    { regex: /\bgrpc\b/i, canonical: 'grpc' },
    // Domain/role tech tags
    { regex: /\bfullstack\b|\bfull[\s-]stack\b/i, canonical: 'fullstack' },
    { regex: /\bfrontend\b|\bfront[\s-]end\b/i, canonical: 'frontend' },
    { regex: /\bbackend\b|\bback[\s-]end\b/i, canonical: 'backend' },
    { regex: /\bmobile\b/i, canonical: 'mobile' },
    { regex: /\bios\b/i, canonical: 'ios' },
    { regex: /\bandroid\b/i, canonical: 'android' },
    { regex: /\bflutter\b/i, canonical: 'flutter' },
    { regex: /\bxamarin\b/i, canonical: 'xamarin' },
    // DevOps/infra/cloud
    { regex: /\bdevops\b/i, canonical: 'devops' },
    { regex: /\bdocker\b/i, canonical: 'docker' },
    { regex: /\bkubernetes\b|\bk8s\b/i, canonical: 'kubernetes' },
    { regex: /\bhelm\b/i, canonical: 'helm' },
    { regex: /\bansible\b/i, canonical: 'ansible' },
    { regex: /\bjenkins\b/i, canonical: 'jenkins' },
    { regex: /\bgithub actions\b/i, canonical: 'github-actions' },
    { regex: /\bgitlab ci\b|\bgitlab-ci\b/i, canonical: 'gitlab-ci' },
    { regex: /\bcircleci\b/i, canonical: 'circleci' },
    { regex: /\bargo ?cd\b/i, canonical: 'argocd' },
    { regex: /\baws\b/i, canonical: 'aws' },
    { regex: /\bazure\b/i, canonical: 'azure' },
    { regex: /\bgcp\b|\bgoogle cloud\b/i, canonical: 'gcp' },
    { regex: /\bserverless\b/i, canonical: 'serverless' },
    { regex: /\blambda\b/i, canonical: 'lambda' },
    { regex: /\becs\b/i, canonical: 'ecs' },
    { regex: /\beks\b/i, canonical: 'eks' },
    { regex: /\baks\b/i, canonical: 'aks' },
    // Databases/search/cache/queue
    { regex: /\bpostgres(?:ql)?\b/i, canonical: 'postgres' },
    { regex: /\bmysql\b/i, canonical: 'mysql' },
    { regex: /\bmariadb\b/i, canonical: 'mariadb' },
    { regex: /\bsql server\b|\bmssql\b/i, canonical: 'sql-server' },
    { regex: /\boracle\b/i, canonical: 'oracle' },
    { regex: /\bsnowflake\b/i, canonical: 'snowflake' },
    { regex: /\bbigquery\b/i, canonical: 'bigquery' },
    { regex: /\bmongodb\b/i, canonical: 'mongodb' },
    { regex: /\bcassandra\b/i, canonical: 'cassandra' },
    { regex: /\bneo4j\b/i, canonical: 'neo4j' },
    { regex: /\bdynamodb\b/i, canonical: 'dynamodb' },
    { regex: /\bredis\b/i, canonical: 'redis' },
    { regex: /\belasticsearch\b|\belastic search\b/i, canonical: 'elasticsearch' },
    { regex: /\bopensearch\b/i, canonical: 'opensearch' },
    { regex: /\brabbitmq\b/i, canonical: 'rabbitmq' },
    { regex: /\bkinesis\b/i, canonical: 'kinesis' },
    { regex: /\bgraphql\b/i, canonical: 'graphql' },
    { regex: /\brest\b|\brestful\b/i, canonical: 'rest' },
    { regex: /\bcrud\b/i, canonical: 'crud' },
    { regex: /\bauthentication\b|autentica(?:ç|c)[aã]o/i, canonical: 'autenticacao' },
    { regex: /\bauthorization\b|autoriza(?:ç|c)[aã]o/i, canonical: 'autorizacao' },
    { regex: /\boauth2?\b|\boauth 2(?:\\.0)?\b/i, canonical: 'oauth' },
    { regex: /\bopenid(?: connect)?\b|\boidc\b/i, canonical: 'oidc' },
    { regex: /\bjwt\b/i, canonical: 'jwt' },
    { regex: /\bstripe\b/i, canonical: 'stripe' },
    { regex: /\bpaypal\b/i, canonical: 'paypal' },
    { regex: /\bpagament(?:o|os)\b|payments?\b|billing\b/i, canonical: 'pagamentos' },
    { regex: /\bpci(?:-dss)?\b/i, canonical: 'pci-dss' },
    { regex: /\bwebhooks?\b/i, canonical: 'webhook' },
    { regex: /\bapi gateway\b/i, canonical: 'api-gateway' },
    { regex: /\brate limit(?:ing)?\b/i, canonical: 'rate-limiting' },
    { regex: /\bci\/cd\b|\bci-cd\b/i, canonical: 'ci-cd' },
    { regex: /\bclean architecture\b/i, canonical: 'clean-architecture' },
    { regex: /\bddd\b|\bdomain driven design\b/i, canonical: 'ddd' },
    { regex: /\bdesign patterns?\b/i, canonical: 'design-patterns' },
    { regex: /\bscrum\b/i, canonical: 'scrum' },
    { regex: /\bsolid\b/i, canonical: 'solid' },
    { regex: /\btdd\b/i, canonical: 'tdd' },
    { regex: /\bbdd\b/i, canonical: 'bdd' },
    { regex: /\bcqrs\b/i, canonical: 'cqrs' },
    { regex: /\bevent driven\b|\bevent-driven\b/i, canonical: 'event-driven' },
    { regex: /\bsaga pattern\b|\bsaga\b/i, canonical: 'saga' },
    { regex: /\bcache\b|caching\b/i, canonical: 'cache' },
    { regex: /\bcdn\b/i, canonical: 'cdn' },
    { regex: /\betl\b/i, canonical: 'etl' },
    { regex: /\belt\b/i, canonical: 'elt' },
    { regex: /\bdata warehouse\b/i, canonical: 'data-warehouse' },
    { regex: /\bfeature flags?\b/i, canonical: 'feature-flags' },
    { regex: /\ba\/b testing\b|\bab testing\b/i, canonical: 'ab-testing' },
    { regex: /\bobservability\b/i, canonical: 'observability' },
    { regex: /\bincident response\b/i, canonical: 'incident-response' },
    { regex: /\bsecurity\b|seguran[çc]a\b/i, canonical: 'security' },
    { regex: /\blgpd\b|\bgdpr\b/i, canonical: 'lgpd-gdpr' },
    { regex: /\bacessibilidade\b|\ba11y\b/i, canonical: 'acessibilidade' },
    { regex: /\bi18n\b|\binternationalization\b/i, canonical: 'i18n' },
    { regex: /\bl10n\b|\blocalization\b/i, canonical: 'l10n' },
    { regex: /\bkafka\b/i, canonical: 'kafka' },
    { regex: /\bmicroservices?\b/i, canonical: 'microservices' },
    // Web/platform/tooling/testing
    { regex: /\bhtml5?\b/i, canonical: 'html' },
    { regex: /\bcss3?\b/i, canonical: 'css' },
    { regex: /\btailwind(?:\s*css)?\b/i, canonical: 'tailwind' },
    { regex: /\bsass\b|\bscss\b/i, canonical: 'sass' },
    { regex: /\bwebpack\b/i, canonical: 'webpack' },
    { regex: /\bbabel\b/i, canonical: 'babel' },
    { regex: /\beslint\b/i, canonical: 'eslint' },
    { regex: /\bprettier\b/i, canonical: 'prettier' },
    { regex: /\bprisma\b/i, canonical: 'prisma' },
    { regex: /\bsequelize\b/i, canonical: 'sequelize' },
    { regex: /\btypeorm\b/i, canonical: 'typeorm' },
    { regex: /\bhibernate\b/i, canonical: 'hibernate' },
    { regex: /\bgit\b/i, canonical: 'git' },
    { regex: /\blinux\b/i, canonical: 'linux' },
    { regex: /\bshell\b|\bbash\b|\bzsh\b/i, canonical: 'shell' },
    { regex: /\bjson\b/i, canonical: 'json' },
    { regex: /\byaml\b/i, canonical: 'yaml' },
    { regex: /\byang\b/i, canonical: 'yang' },
    { regex: /\bgroovy\b/i, canonical: 'groovy' },
    { regex: /\bquarkus\b/i, canonical: 'quarkus' },
    { regex: /\bspring boot\b/i, canonical: 'spring-boot' },
    { regex: /\bpostgresql\b/i, canonical: 'postgres' },
    { regex: /\bsql\b/i, canonical: 'sql' },
    { regex: /\bnosql\b/i, canonical: 'nosql' },
    { regex: /\barangodb\b/i, canonical: 'arangodb' },
    { regex: /\bapi(?:s)?\b/i, canonical: 'api' },
    { regex: /\bcloud\b/i, canonical: 'cloud' },
    { regex: /\bs3\b/i, canonical: 's3' },
    { regex: /\bjest\b/i, canonical: 'jest' },
    { regex: /\bcypress\b/i, canonical: 'cypress' },
    { regex: /\bplaywright\b/i, canonical: 'playwright' },
    { regex: /\bselenium\b/i, canonical: 'selenium' },
    { regex: /\bjunit\b/i, canonical: 'junit' },
    { regex: /\bpytest\b/i, canonical: 'pytest' },
    // AI / automation
    { regex: /\bia\b|\bai\b|\bartificial intelligence\b|intelig[êe]ncia artificial/i, canonical: 'ia' },
    { regex: /\bautom[aá]([çc][aã]o|coes|ções)\b|\bautomation\b/i, canonical: 'automacao' },
    { regex: /\bn8n\b/i, canonical: 'n8n' },
    { regex: /\bmake\b|\bmake\.com\b/i, canonical: 'make' },
    { regex: /\blow[\s-]?code\b/i, canonical: 'low-code' },
    { regex: /\bno[\s-]?code\b/i, canonical: 'no-code' },
    { regex: /\bopenai\b/i, canonical: 'openai' },
    { regex: /\bchatgpt\b/i, canonical: 'chatgpt' },
    { regex: /\bclaude\b/i, canonical: 'claude' },
    { regex: /\bclaude code\b/i, canonical: 'claude-code' },
    { regex: /\bcursor\b/i, canonical: 'cursor' },
    { regex: /\bgithub copilot\b|\bcopilot\b/i, canonical: 'github-copilot' },
    { regex: /\bwindsurf\b/i, canonical: 'windsurf' },
    { regex: /\baider\b/i, canonical: 'aider' },
    { regex: /\bcody\b/i, canonical: 'cody' },
    { regex: /\btabnine\b/i, canonical: 'tabnine' },
    { regex: /\bcodeium\b/i, canonical: 'codeium' },
    { regex: /\breplit ai\b|\breplit agent\b/i, canonical: 'replit-ai' },
    { regex: /\bbolt\.?new\b|\bbolt\b/i, canonical: 'bolt-new' },
    { regex: /\bv0\b|\bv0\.dev\b/i, canonical: 'v0' },
    { regex: /\blovable\b/i, canonical: 'lovable' },
    { regex: /\bcontinue\.?dev\b|\bcontinue\b/i, canonical: 'continue' },
    { regex: /\bsourcegraph\b/i, canonical: 'sourcegraph' },
    { regex: /\bantigravity\b/i, canonical: 'antigravity' },
    { regex: /\bprompt engineering\b/i, canonical: 'prompt-engineering' },
    { regex: /\brag\b/i, canonical: 'rag' },
    { regex: /\bvector db\b|\bvector database\b/i, canonical: 'vector-db' },
    { regex: /\bllm\b|\blarge language model/i, canonical: 'llm' },
    { regex: /\blangchain\b/i, canonical: 'langchain' },
    // Observability
    { regex: /\bprometheus\b/i, canonical: 'prometheus' },
    { regex: /\bgrafana\b/i, canonical: 'grafana' },
    { regex: /\bdatadog\b/i, canonical: 'datadog' },
    { regex: /\bnew relic\b/i, canonical: 'new-relic' },
    { regex: /\bsentry\b/i, canonical: 'sentry' },
];

export function inferStackFromText(text: string): string[] {
    const found: string[] = [];

    for (const { regex, canonical } of TITLE_TECH_PATTERNS) {
        if (regex.test(text) && !found.includes(canonical)) {
            found.push(canonical);
        }
    }

    return found;
}

/**
 * Tenta extrair keywords de tecnologia do título da vaga quando o campo `stack` está vazio.
 * Retorna os termos encontrados no mesmo formato normalizado usado pelo stack.
 */
export function inferStackFromTitle(title: string): string[] {
    return inferStackFromText(title);
}
