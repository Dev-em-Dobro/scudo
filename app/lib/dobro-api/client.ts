import { getDobroApiConfig, type DobroApiConfig } from '@/app/lib/dobro-api/config';
import {
    getDefaultJornadaCourseSlugs,
    listCoursesCatalog,
    resolveCourseSlugFromCatalog,
} from '@/app/lib/dobro-api/courses-catalog';
import type {
    DobroApiCourseListResponse,
    DobroApiCourseTree,
    DobroApiErrorResponse,
    DobroApiLessonInTree,
    DobroApiModuleInTree,
} from '@/app/lib/dobro-api/types';

export type { DobroApiCourseTree, DobroApiLessonInTree, DobroApiModuleInTree };

export type FlattenedDobroApiLesson = DobroApiLessonInTree & {
    moduleTitle: string;
    moduleOrder: number;
    courseSlug: string;
    courseTitle: string;
};

export class DobroApiClientError extends Error {
    readonly statusCode: number;
    readonly path: string;

    constructor(message: string, statusCode: number, path: string) {
        super(message);
        this.name = 'DobroApiClientError';
        this.statusCode = statusCode;
        this.path = path;
    }
}

async function fetchDobroApiJson<T>(path: string, config: DobroApiConfig): Promise<T> {
    const url = `${config.baseUrl}${path}`;

    const response = await fetch(url, {
        headers: {
            'x-api-key': config.apiKey,
            Accept: 'application/json',
        },
        signal: AbortSignal.timeout(config.timeoutMs),
        cache: 'no-store',
    });

    if (!response.ok) {
        let message = `Falha na dobro-api (HTTP ${response.status}).`;

        try {
            const payload = (await response.json()) as DobroApiErrorResponse;
            if (payload.message) {
                message = payload.message;
            }
        } catch {
            // resposta não-JSON
        }

        throw new DobroApiClientError(message, response.status, path);
    }

    return response.json() as Promise<T>;
}

export async function listDobroApiCourses(
    params?: { limit?: number; offset?: number },
    configOverride?: Partial<DobroApiConfig>,
): Promise<DobroApiCourseListResponse> {
    const config = getDobroApiConfig(configOverride);
    const search = new URLSearchParams();

    search.set('limit', String(params?.limit ?? 100));
    search.set('offset', String(params?.offset ?? 0));

    return fetchDobroApiJson<DobroApiCourseListResponse>(`/api/v1/courses?${search}`, config);
}

export async function fetchDobroApiCourseTree(
    courseSlug?: string,
    configOverride?: Partial<DobroApiConfig>,
): Promise<DobroApiCourseTree> {
    const config = getDobroApiConfig(configOverride);
    const slug = courseSlug ?? config.courseSlug;

    return fetchDobroApiJson<DobroApiCourseTree>(
        `/api/v1/courses/${encodeURIComponent(slug)}/tree`,
        { ...config, courseSlug: slug },
    );
}

export function flattenDobroApiCourseTree(tree: DobroApiCourseTree): FlattenedDobroApiLesson[] {
    const courseSlug = tree.slug ?? '';
    const courseTitle = tree.title;

    return tree.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({
            ...lesson,
            moduleTitle: module.title,
            moduleOrder: module.order,
            courseSlug,
            courseTitle,
        })),
    );
}

export async function fetchFlattenedDobroApiLessons(
    courseSlug?: string,
    configOverride?: Partial<DobroApiConfig>,
): Promise<FlattenedDobroApiLesson[]> {
    const tree = await fetchDobroApiCourseTree(courseSlug, configOverride);
    return flattenDobroApiCourseTree(tree);
}

export async function fetchFlattenedDobroApiLessonsForJornada(
    configOverride?: Partial<DobroApiConfig>,
): Promise<FlattenedDobroApiLesson[]> {
    const slugs = getDefaultJornadaCourseSlugs();
    const merged = new Map<number, FlattenedDobroApiLesson>();

    for (const slug of slugs) {
        const lessons = await fetchFlattenedDobroApiLessons(slug, configOverride);

        for (const lesson of lessons) {
            merged.set(lesson.curseducaId, lesson);
        }
    }

    return [...merged.values()].sort((a, b) => a.curseducaId - b.curseducaId);
}

export {
    getDefaultJornadaCourseSlugs,
    getJornadaCourseSlugsConfig,
    isJornadaBoardCourseSlug,
    listCoursesCatalog,
    resolveCourseSlugFromCatalog,
};
