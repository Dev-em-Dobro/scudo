import { prisma } from '@/app/lib/prisma';
import type { JornadaStage, JornadaTask } from '@/app/types';

import { fetchCodeQuestProgressByEmail, type CodeQuestProgress } from '@/app/lib/codequest/service';
import { MOCK_STAGES, MOCK_TASKS } from '@/app/lib/jornada/mockJornada';

const taskById = new Map<string, JornadaTask>(MOCK_TASKS.map((task) => [task.id, task]));

export const PRATICA_TASK_IDS = new Set(
    MOCK_TASKS
        .filter((t) => t.kind === 'pratica' || t.title.toLowerCase().includes('exercício'))
        .map((t) => t.id),
);

export function isPraticaTask(task: JornadaTask): boolean {
    return PRATICA_TASK_IDS.has(task.id);
}

export type JornadaSnapshot = {
    stages: JornadaStage[];
    tasks: JornadaTask[];
    completedTaskIds: string[];
    currentRankLetter: string;
    editableStageId: string;
    codeQuestProgress: CodeQuestProgress | null;
    hasCodeQuestAccount: boolean;
};

function withPersistedStatuses(completedTaskIds: Set<string>) {
    return MOCK_TASKS.map((task) => ({
        ...task,
        status: completedTaskIds.has(task.id) ? 'done' : 'pending',
    })) satisfies JornadaTask[];
}

function computeCurrentRankLetter(stages: JornadaStage[], tasks: JornadaTask[]) {
    const editableStageId = computeEditableStageId(stages, tasks);
    const currentStage = stages.find((stage) => stage.id === editableStageId);

    return currentStage?.rankLetter ?? 'I';
}

function computeEditableStageId(stages: JornadaStage[], tasks: JornadaTask[]) {
    const tasksByStage = new Map<string, JornadaTask[]>();

    for (const task of tasks) {
        const list = tasksByStage.get(task.stageId) ?? [];
        list.push(task);
        tasksByStage.set(task.stageId, list);
    }

    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    for (const stage of sortedStages) {
        const stageTasks = tasksByStage.get(stage.id) ?? [];
        const hasPendingTask = stageTasks.some((task) => task.status !== 'done');

        if (hasPendingTask) {
            return stage.id;
        }
    }

    return sortedStages.at(-1)?.id ?? '';
}

export function getCatalogTaskById(taskId: string) {
    return taskById.get(taskId) ?? null;
}

export async function isTaskEditableForUser(userId: string, taskId: string) {
    const task = getCatalogTaskById(taskId);
    if (!task) {
        return false;
    }

    const snapshot = await getUserJornadaSnapshot(userId);

    return task.stageId === snapshot.editableStageId;
}

export async function isOfficialStudentUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            officialStudentVerifiedAt: true,
        },
    });

    return Boolean(user?.officialStudentVerifiedAt);
}

export async function autoSyncPraticaTasksForUser(userId: string) {
    const existing = await prisma.userJornadaTaskProgress.findMany({
        where: { userId },
        select: { taskId: true },
    });
    const completedTaskIds = new Set(existing.map((e) => e.taskId));
    const praticaIds = [...PRATICA_TASK_IDS];
    const missing = praticaIds.filter((id) => !completedTaskIds.has(id));

    if (missing.length === 0) {
        return;
    }

    const now = new Date();
    await prisma.userJornadaTaskProgress.createMany({
        data: missing.map((taskId) => ({
            userId,
            taskId,
            completedAt: now,
        })),
        skipDuplicates: true,
    });
}

const CODEQUEST_CATEGORY_TASK_IDS: Record<string, string[]> = {
    HTML: [
        'ferro-13',
        'ferro-15',
        'ferro-17',
        'ferro-19',
        'ferro-21',
    ],
    CSS: [
        'ferro-26',
        'ferro-28',
        'ferro-30',
        'ferro-32',
        'bronze-4',
        'bronze-6',
        'bronze-19',
        'bronze-23',
        'bronze-25',
        'bronze-28',
    ],
    JS: [
        'prata-2',
        'prata-4',
        'prata-7',
        'prata-9',
        'prata-11',
        'prata-13',
        'prata-15',
        'prata-17',
        'prata-20',
        'prata-24',
        'prata-35',
    ],
};

// Maps individual CodeQuest exercise IDs to the Jornada task they unlock.
// Multiple exercises can map to the same Jornada task (any one completing it is enough).
const CODEQUEST_EXERCISE_TASK_IDS: Record<string, string> = {
    // HTML
    'html-headings-paragrafos-listas': 'ferro-13',
    'html-tags-essenciais-paragrafo': 'ferro-13',
    'html-lista-frutas': 'ferro-13',
    'html-atributos-links-imagens': 'ferro-15',
    'html-tags-essenciais-link': 'ferro-15',
    'html-tags-essenciais-imagem': 'ferro-15',
    'html-tags-essenciais-comentarios': 'ferro-17',
    'html-tabelas-basico': 'ferro-19',
    'html-tags-essenciais-tabela': 'ferro-19',
    'html-semantica-estrutura-basica': 'ferro-21',
    'html-tags-semanticas-estrutura': 'ferro-21',
    // CSS – display
    'html-css-display-block-links': 'ferro-26',
    'display-inline': 'ferro-26',
    'display-inline-block': 'ferro-26',
    'display-none-media-query': 'ferro-26',
    // CSS – seletores
    'css-seletores-classes-ids': 'ferro-28',
    // CSS – cores/fontes
    'html-css-cores-fontes-estilizacao-texto': 'ferro-30',
    // CSS – box model
    'html-css-box-model-padding-margin-border-boxsizing': 'ferro-32',
    // CSS – flexbox justify-content
    'css-flexbox-justify-content': 'bronze-4',
    'css-flexbox-justify-content-space-between': 'bronze-4',
    'css-flexbox-basico': 'bronze-4',
    'flexbox-cards-produtos': 'bronze-4',
    'flexbox-centralizar-div': 'bronze-4',
    'flexbox-flex-direction-column': 'bronze-4',
    // CSS – align-items
    'css-flexbox-align-items-flex-end': 'bronze-6',
    'css-flexbox-align-items-center': 'bronze-6',
    'flexbox-flex-wrap-cards': 'bronze-6',
    'flexbox-grow-basico': 'bronze-6',
    'flexbox-layout-completo': 'bronze-6',
    // CSS – grid template
    'css-grid-template-columns-rows-gap': 'bronze-19',
    'css-grid-basico': 'bronze-19',
    // CSS – grid area
    'css-grid-area': 'bronze-23',
    // CSS – grid auto-fill/fit
    'grid-autofill-autofit': 'bronze-25',
    // CSS – media query
    'css-responsividade-media-query': 'bronze-28',
    // JS – variáveis/console/template
    'javascript-variaveis-console': 'prata-2',
    'javascript-template-literal': 'prata-2',
    // JS – tipos primitivos
    'javascript-tipos-primitivos': 'prata-4',
    // JS – operadores lógicos
    'javascript-operadores-logicos': 'prata-7',
    'javascript-operadores-relacionais': 'prata-7',
    'javascript-operador-not': 'prata-7',
    // JS – operadores matemáticos
    'javascript-operadores-matematicos': 'prata-9',
    // JS – condicionais
    'javascript-condicionais-if-else': 'prata-11',
    'javascript-condicional-switch': 'prata-11',
    // JS – loops
    'javascript-loop-for': 'prata-13',
    'javascript-loop-while': 'prata-13',
    'javascript-loop-do-while': 'prata-13',
    // JS – funções
    'javascript-funcao-nomeada-saudar-usuario': 'prata-15',
    'javascript-funcao-com-retorno-soma': 'prata-15',
    // JS – arrow function
    'javascript-arrow-function': 'prata-17',
    // JS – arrays forEach
    'javascript-arrays-for-foreach': 'prata-20',
    // JS – arrays e objetos
    'javascript-arrays-frutas': 'prata-24',
    'javascript-objetos-pessoa': 'prata-24',
    'javascript-filter-objetos': 'prata-24',
    'javascript-find-array-objetos': 'prata-24',
    'javascript-map-objetos': 'prata-24',
    'javascript-reduce-soma': 'prata-24',
    'javascript-reduce-carrinho': 'prata-24',
    'javascript-spread-operator': 'prata-24',
    'javascript-destructuring-rest-default': 'prata-24',
    // JS – consumo de APIs
    'js-api-posts': 'prata-35',
    'js-api-detalhes-usuario': 'prata-35',
    'js-consumo-api-async-await': 'prata-35',
};

async function autoSyncSpecificTasks(
    userId: string,
    taskIds: string[],
    completedTaskIds: Set<string>,
) {
    const missing = taskIds.filter((id) => !completedTaskIds.has(id));

    if (missing.length === 0) {
        return;
    }

    const now = new Date();
    await prisma.userJornadaTaskProgress.createMany({
        data: missing.map((taskId) => ({
            userId,
            taskId,
            completedAt: now,
        })),
        skipDuplicates: true,
    });

    for (const id of missing) {
        completedTaskIds.add(id);
    }
}

export async function getUserJornadaSnapshot(userId: string): Promise<JornadaSnapshot> {
    const [progress, user] = await Promise.all([
        prisma.userJornadaTaskProgress.findMany({
            where: { userId },
            select: { taskId: true },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        }),
    ]);

    const completedTaskIds = new Set<string>(progress.map((item) => item.taskId));
    const email = user?.email ?? null;

    let codeQuestProgress: CodeQuestProgress | null = null;

    if (email) {
        codeQuestProgress = await fetchCodeQuestProgressByEmail(email);

        if (codeQuestProgress) {
            // Sync per individual exercise
            const exerciseTaskIds = codeQuestProgress.completedExerciseIds
                .map((exId) => CODEQUEST_EXERCISE_TASK_IDS[exId])
                .filter((taskId): taskId is string => taskId !== undefined);
            if (exerciseTaskIds.length > 0) {
                await autoSyncSpecificTasks(userId, exerciseTaskIds, completedTaskIds);
            }

            // Sync per full category completion
            for (const cat of codeQuestProgress.byCategory) {
                if (cat.total > 0 && cat.done >= cat.total) {
                    const taskIds = CODEQUEST_CATEGORY_TASK_IDS[cat.category] ?? [];
                    await autoSyncSpecificTasks(userId, taskIds, completedTaskIds);
                }
            }
        }
    }

    const tasks = withPersistedStatuses(completedTaskIds);
    const editableStageId = computeEditableStageId(MOCK_STAGES, tasks);

    return {
        stages: MOCK_STAGES,
        tasks,
        completedTaskIds: [...completedTaskIds],
        currentRankLetter: computeCurrentRankLetter(MOCK_STAGES, tasks),
        editableStageId,
        codeQuestProgress,
        hasCodeQuestAccount: codeQuestProgress !== null,
    };
}

export async function setTaskDoneForUser(userId: string, taskId: string, done: boolean) {
    if (done) {
        await prisma.userJornadaTaskProgress.upsert({
            where: {
                userId_taskId: {
                    userId,
                    taskId,
                },
            },
            update: {
                completedAt: new Date(),
            },
            create: {
                userId,
                taskId,
                completedAt: new Date(),
            },
        });
        return;
    }

    await prisma.userJornadaTaskProgress.deleteMany({
        where: {
            userId,
            taskId,
        },
    });
}