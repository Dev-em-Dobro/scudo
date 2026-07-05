import type { AtsResumeTechnologyGroups } from '@/app/lib/resume/types';

export type CourseProjectDefinition = {
    key: string;
    unlockAtStageId: string;
    title: string;
    description: string;
    technologies: string[];
    deployUrl?: string | null;
};

/**
 * Projetos do curso mapeados para o currículo ATS.
 * Desbloqueiam quando o aluno conclui o rank correspondente.
 */
export const COURSE_PROJECT_CATALOG: CourseProjectDefinition[] = [
    {
        key: 'ecommerce-html-css',
        unlockAtStageId: 's2',
        title: 'E-commerce HTML e CSS',
        description:
            'Landing page responsiva de e-commerce desenvolvida com HTML semântico e CSS moderno. '
            + 'Implementação de layout em grid/flexbox, componentes reutilizáveis, estados de hover/focus '
            + 'e boas práticas de acessibilidade para páginas comerciais.',
        technologies: ['HTML', 'CSS', 'Flexbox', 'Grid', 'Responsividade'],
    },
    {
        key: 'js-consolidacao',
        unlockAtStageId: 's3',
        title: 'Projeto de Consolidação JavaScript',
        description:
            'Aplicação interativa em JavaScript vanilla para consolidar DOM, eventos, manipulação de arrays '
            + 'e lógica de negócio. Foco em código legível, separação de responsabilidades e tratamento de estados.',
        technologies: ['JavaScript', 'DOM', 'ES6+', 'HTML', 'CSS'],
    },
    {
        key: 'super-mario-galaxy',
        unlockAtStageId: 's3',
        title: 'Super Mario Galaxy',
        description:
            'Jogo web inspirado em plataforma 2D com mecânicas de colisão, animações e pontuação. '
            + 'Projeto prático para aplicar lógica de game loop, canvas/DOM e organização de módulos em JS.',
        technologies: ['JavaScript', 'HTML5', 'CSS', 'Canvas'],
    },
    {
        key: 'aura-design',
        unlockAtStageId: 's3',
        title: 'Aura Design — Landing Page',
        description:
            'Landing page com foco em conversão, hierarquia visual e copy orientada a produto. '
            + 'Desenvolvimento mobile-first com tipografia, espaçamento e componentes alinhados ao design system.',
        technologies: ['HTML', 'CSS', 'JavaScript', 'UI Design', 'Responsividade'],
    },
    {
        key: 'syntax-wear-frontend',
        unlockAtStageId: 's5',
        title: 'Syntax Wear — E-commerce Frontend',
        description:
            'Frontend completo de e-commerce com catálogo, carrinho, autenticação e checkout. '
            + 'Arquitetura em React com roteamento, formulários validados, persistência local e deploy em produção.',
        technologies: [
            'React',
            'TypeScript',
            'TanStack Router',
            'Tailwind CSS',
            'Zod',
            'React Hook Form',
            'Local Storage',
            'Vercel',
        ],
    },
    {
        key: 'syntax-wear-backend',
        unlockAtStageId: 's6',
        title: 'Syntax Wear — API Backend',
        description:
            'API REST para e-commerce com autenticação, CRUD de produtos, pedidos e integração com banco relacional. '
            + 'Modelagem com Prisma, middlewares, tratamento de erros e deploy de serviços backend.',
        technologies: ['Node.js', 'Express', 'Prisma', 'PostgreSQL', 'Supabase', 'REST API', 'JWT'],
    },
    {
        key: 'fintrack-ai',
        unlockAtStageId: 's6',
        title: 'FinTrack AI — Gestão Financeira com IA',
        description:
            'Aplicação full stack de controle financeiro com dashboard, transações, gráficos e insights gerados por IA. '
            + 'Autenticação segura, ORM, integração de modelos de linguagem e deploy end-to-end.',
        technologies: [
            'React',
            'TypeScript',
            'Node.js',
            'Prisma',
            'PostgreSQL',
            'Better Auth',
            'Recharts',
            'OpenAI',
        ],
    },
    {
        key: 'projeto-receita',
        unlockAtStageId: 's7',
        title: 'Projeto Receita',
        description:
            'Aplicação web desenvolvida com apoio de IA para acelerar entrega, refatoração e validação de requisitos. '
            + 'Demonstra fluxo AI-driven do setup ao deploy com foco em produtividade e qualidade.',
        technologies: ['React', 'TypeScript', 'JavaScript', 'IA Generativa', 'Git'],
    },
    {
        key: 'freela-ia',
        unlockAtStageId: 's8',
        title: 'Freela com IA',
        description:
            'Projeto autoral simulando entrega para cliente real com escopo, prazo e comunicação profissional. '
            + 'Uso de IA para acelerar desenvolvimento mantendo padrões de qualidade e documentação.',
        technologies: ['React', 'TypeScript', 'Node.js', 'IA Generativa'],
    },
    {
        key: 'botflix',
        unlockAtStageId: 's8',
        title: 'BotFlix',
        description:
            'Interface de catálogo/streaming com listagem, filtros e experiência responsiva. '
            + 'Consolida consumo de API, componentização e estados assíncronos no frontend.',
        technologies: ['React', 'JavaScript', 'CSS', 'API REST'],
    },
    {
        key: 'devlingo',
        unlockAtStageId: 's8',
        title: 'DevLingo',
        description:
            'Aplicação educacional gamificada para prática de conceitos de programação com feedback interativo.',
        technologies: ['JavaScript', 'HTML', 'CSS', 'React'],
    },
    {
        key: 'barbearia-navalha',
        unlockAtStageId: 's8',
        title: 'Barbearia Navalha',
        description:
            'Site institucional para negócio local com seções de serviços, agendamento e identidade visual consistente.',
        technologies: ['HTML', 'CSS', 'JavaScript', 'Responsividade'],
    },
];

const STAGE_ORDER: Record<string, number> = {
    s1: 1,
    s2: 2,
    s3: 3,
    s4: 4,
    s5: 5,
    s6: 6,
    s7: 7,
    s8: 8,
    s9: 9,
    s10: 10,
};

export function getUnlockedCourseProjects(completedStageIds: Set<string>): CourseProjectDefinition[] {
    const maxCompletedOrder = [...completedStageIds]
        .map((stageId) => STAGE_ORDER[stageId] ?? 0)
        .reduce((max, order) => Math.max(max, order), 0);

    return COURSE_PROJECT_CATALOG.filter((project) => {
        const unlockOrder = STAGE_ORDER[project.unlockAtStageId] ?? 0;
        return unlockOrder > 0 && unlockOrder <= maxCompletedOrder;
    });
}

const TECHNOLOGY_GROUP_RULES: Record<keyof AtsResumeTechnologyGroups, string[]> = {
    languages: ['javascript', 'typescript', 'python', 'java', 'html', 'css'],
    frontend: ['react', 'tailwind', 'tailwind css', 'tanstack router', 'recharts', 'canvas', 'ui design', 'responsividade'],
    backend: ['node.js', 'express', 'rest api', 'jwt', 'better auth', 'nestjs'],
    database: ['postgresql', 'prisma', 'supabase', 'sql'],
    cloud: ['vercel', 'aws', 'azure', 'docker'],
    tools: ['git', 'local storage', 'openai', 'ia generativa'],
    methodologies: ['flexbox', 'grid', 'dom', 'es6+'],
};

function normalizeTech(value: string) {
    return value.trim().toLowerCase();
}

export function groupTechnologiesForAts(technologies: string[]): AtsResumeTechnologyGroups {
    const groups: AtsResumeTechnologyGroups = {
        languages: [],
        frontend: [],
        backend: [],
        database: [],
        cloud: [],
        tools: [],
        methodologies: [],
    };

    const seen = new Set<string>();

    for (const tech of technologies) {
        const normalized = normalizeTech(tech);
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);

        let placed = false;
        for (const [groupKey, keywords] of Object.entries(TECHNOLOGY_GROUP_RULES) as Array<
            [keyof typeof groups, string[]]
        >) {
            if (keywords.some((keyword) => normalized.includes(keyword) || keyword.includes(normalized))) {
                groups[groupKey].push(tech);
                placed = true;
                break;
            }
        }

        if (!placed) {
            groups.tools.push(tech);
        }
    }

    return groups;
}

export function buildDefaultProfessionalSummary(rankName: string | null, projectCount: number): string {
    const rankLabel = rankName ? `Formação DevQuest (${rankName})` : 'Formação DevQuest';
    return (
        `Desenvolvedor(a) em formação com ${projectCount} projeto(s) prático(s) no portfólio. `
        + `${rankLabel} com foco em entrega full stack, código limpo e experiências reais de produto. `
        + 'Busco oportunidade para aplicar React, TypeScript, Node.js e boas práticas de APIs em times de tecnologia.'
    );
}
