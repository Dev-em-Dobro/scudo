import {
    getCodeQuestExerciseOptionsForTask,
    isMultiExerciseTask,
} from '@/app/lib/jornada/codequestExerciseMap';
import { getCurseducaClassIdByTaskId } from '@/app/lib/jornada/curseducaLessonTaskMap';

export const CODEQUEST_APP_URL =
    process.env.NEXT_PUBLIC_CODEQUEST_URL ?? 'https://codequest.devemdobro.com';

export const CURSEDUCA_APP_URL =
    process.env.NEXT_PUBLIC_CURSEDUCA_APP_URL ?? 'https://devquest.curseduca.pro';

const CURSEDUCA_COURSE_SLUG_BY_CLASS_ID: Record<number, string> = {
    6740: 'primeiros-passos-1776350627138',
    6748: 'primeiros-passos-1776350627138',
    6741: 'primeiros-passos-1776350627138',
    6742: 'primeiros-passos-1776350627138',
    6743: 'primeiros-passos-1776350627138',
    6781: 'primeiros-passos-1776350627138',
    6744: 'primeiros-passos-1776350627138',
    6745: 'primeiros-passos-1776350627138',
    6746: 'primeiros-passos-1776350627138',
    6747: 'primeiros-passos-1776350627138',
    6777: 'primeiros-passos-1776350627138',
    6734: 'devquest-20-frontend-1756431088527',
    6735: 'devquest-20-backend-1756431100113',
};

const DEFAULT_FRONTEND_COURSE_SLUG = 'devquest-20-frontend-1756431088527';
const DEFAULT_BACKEND_COURSE_SLUG = 'devquest-20-backend-1756431100113';
const DEFAULT_EMPREGABILIDADE_COURSE_SLUG =
    'devquest-20-empregabilidade-1756431115888';
const SYNTAX_WEAR_COURSE_SLUG = 'projeto-e-commerce-1764442100039';
const NEXTJS_COURSE_SLUG = 'em-breve-nextjs-1761674389149';
const FINTRACK_COURSE_SLUG = 'fintrack-ai-dashboard-financeiro-com-nextjs-1774658268942';

/** Projetos extras (marco Scudo) → curso Curseduca, sem aula individual. */
const EXTRA_PROJECT_COURSE_SLUG_BY_TASK_ID: Record<string, string> = {
    'mythril-3': 'freela-com-ia-1759450120073',
    'ouro-60': 'projeto-botflix',
    'platina-63': 'projeto-devlingo-1770063468709',
    'ouro-59': 'projeto-fundo-magico-1760624852163',
    'mythril-2': 'projeto-king-burguer',
    'mythril-1': 'workshop-projeto-barbearia-feita-com-reactjs-1769467886006',
    'mythril-11': 'projeto-aura-design-1778172969546',
    'mythril-12': 'landing-page-mario-galaxy',
};

const NEXTJS_FUNDAMENTALS_CLASS_IDS = new Set([6695, 6696, 6697, 6698, 6699, 6700]);

function isSyntaxWearClassId(classId: number): boolean {
    return classId >= 6506 && classId <= 6572;
}

function isNextJsFundamentalsClassId(classId: number): boolean {
    return NEXTJS_FUNDAMENTALS_CLASS_IDS.has(classId);
}

function isFinTrackClassId(classId: number): boolean {
    return classId >= 6702 && classId <= 6717;
}

function isSyntaxWearJornadaTask(taskId: string): boolean {
    if (taskId.startsWith('platina-')) {
        const order = Number(taskId.split('-')[1]);
        return order >= 100 && order <= 127;
    }

    if (taskId.startsWith('esmeralda-')) {
        const order = Number(taskId.split('-')[1]);
        return order >= 94 && order <= 125;
    }

    return false;
}

function isNextJsJornadaTask(taskId: string): boolean {
    const match = taskId.match(/^esmeralda-(\d+)$/);
    if (!match) {
        return false;
    }

    const order = Number(match[1]);
    return order >= 126 && order <= 131;
}

function isFinTrackJornadaTask(taskId: string): boolean {
    const match = taskId.match(/^esmeralda-(\d+)$/);
    if (!match) {
        return false;
    }

    const order = Number(match[1]);
    return order >= 132 && order <= 146;
}

function isBackendJornadaTask(taskId: string): boolean {
    if (taskId.startsWith('esmeralda-')) {
        return true;
    }

    const match = taskId.match(/^platina-(\d+)$/);
    if (!match) {
        return false;
    }

    const order = Number(match[1]);
    return order >= 16 && order <= 47;
}

function isEmpregabilidadeJornadaTask(taskId: string): boolean {
    const match = taskId.match(/^platina-(\d+)$/);
    if (!match) {
        return false;
    }

    const order = Number(match[1]);
    return (
        order === 67 ||
        (order >= 48 && order <= 62) ||
        (order >= 70 && order <= 99)
    );
}

export type PracticeLink =
    | {
          mode: 'single';
          href: string;
          label: string;
          codeQuestSlug: string;
      }
    | {
          mode: 'multi';
          label: string;
          exerciseCount: number;
      }
    | {
          mode: 'curseduca';
          href: string;
          label: string;
      }
    | {
          mode: 'home';
          href: string;
          label: string;
      };

function buildCurseducaLessonPath(classId: number, taskId?: string): string {
    let courseSlug = CURSEDUCA_COURSE_SLUG_BY_CLASS_ID[classId];

    if (!courseSlug) {
        if (isSyntaxWearClassId(classId) || (taskId && isSyntaxWearJornadaTask(taskId))) {
            courseSlug = SYNTAX_WEAR_COURSE_SLUG;
        } else if (isNextJsFundamentalsClassId(classId) || (taskId && isNextJsJornadaTask(taskId))) {
            courseSlug = NEXTJS_COURSE_SLUG;
        } else if (isFinTrackClassId(classId) || (taskId && isFinTrackJornadaTask(taskId))) {
            courseSlug = FINTRACK_COURSE_SLUG;
        } else if (taskId && isEmpregabilidadeJornadaTask(taskId)) {
            courseSlug = DEFAULT_EMPREGABILIDADE_COURSE_SLUG;
        } else if (taskId && isBackendJornadaTask(taskId)) {
            courseSlug = DEFAULT_BACKEND_COURSE_SLUG;
        } else {
            courseSlug = DEFAULT_FRONTEND_COURSE_SLUG;
        }
    }

    return `/m/lessons/${courseSlug}?classId=${classId}`;
}

export function buildCurseducaCourseUrl(courseSlug: string): string {
    return new URL(`/m/lessons/${courseSlug}`, CURSEDUCA_APP_URL).toString();
}

export function buildCurseducaLessonUrl(classId: number, taskId?: string): string {
    return new URL(buildCurseducaLessonPath(classId, taskId), CURSEDUCA_APP_URL).toString();
}

export function buildCodeQuestExerciseUrl(slug: string): string {
    return `${CODEQUEST_APP_URL.replace(/\/$/, '')}/exercise/${slug}`;
}

export function resolvePracticeLink(taskId: string): PracticeLink {
    const exercises = getCodeQuestExerciseOptionsForTask(taskId);
    const classId = getCurseducaClassIdByTaskId(taskId);

    if (exercises.length === 1) {
        const slug = exercises[0].slug;
        return {
            mode: 'single',
            href: buildCodeQuestExerciseUrl(slug),
            label: 'Ir para o exercício',
            codeQuestSlug: slug,
        };
    }

    if (isMultiExerciseTask(taskId)) {
        return {
            mode: 'multi',
            label: 'Escolher exercício',
            exerciseCount: exercises.length,
        };
    }

    if (classId !== null) {
        return {
            mode: 'curseduca',
            href: buildCurseducaLessonUrl(classId, taskId),
            label: 'Ir para a aula',
        };
    }

    const extraProjectSlug = EXTRA_PROJECT_COURSE_SLUG_BY_TASK_ID[taskId];
    if (extraProjectSlug) {
        return {
            mode: 'curseduca',
            href: buildCurseducaCourseUrl(extraProjectSlug),
            label: 'Ir para o projeto',
        };
    }

    return {
        mode: 'home',
        href: CODEQUEST_APP_URL,
        label: 'Ir para o CodeQuest',
    };
}

export function getCurseducaLessonUrlForTask(taskId: string): string | null {
    const classId = getCurseducaClassIdByTaskId(taskId);
    return classId === null ? null : buildCurseducaLessonUrl(classId, taskId);
}
