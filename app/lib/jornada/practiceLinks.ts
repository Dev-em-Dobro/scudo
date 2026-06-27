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
    const courseSlug =
        CURSEDUCA_COURSE_SLUG_BY_CLASS_ID[classId] ??
        (taskId && isEmpregabilidadeJornadaTask(taskId)
            ? DEFAULT_EMPREGABILIDADE_COURSE_SLUG
            : taskId && isBackendJornadaTask(taskId)
              ? DEFAULT_BACKEND_COURSE_SLUG
              : DEFAULT_FRONTEND_COURSE_SLUG);

    return `/m/lessons/${courseSlug}?classId=${classId}`;
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
