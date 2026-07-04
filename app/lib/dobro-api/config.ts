import {
    getDefaultJornadaCourseSlugs,
    getPrimaryJornadaCourseSlug,
    resolveCourseSlugFromCatalog,
} from '@/app/lib/dobro-api/courses-catalog';

const DEFAULT_BASE_URL = 'https://dobro-api.vercel.app';

export type DobroApiConfig = {
    baseUrl: string;
    apiKey: string;
    courseSlug: string;
    timeoutMs: number;
};

export function getDobroApiConfig(overrides?: Partial<DobroApiConfig>): DobroApiConfig {
    const baseUrl = (overrides?.baseUrl ?? process.env.DOBRO_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    const apiKey = overrides?.apiKey ?? process.env.DOBRO_API_KEY ?? '';
    const courseSlug =
        overrides?.courseSlug ??
        resolveCourseSlugFromCatalog(process.env.DOBRO_API_COURSE_SLUG);

    if (!apiKey) {
        throw new Error('DOBRO_API_KEY é obrigatória para consumir o gateway dobro-api.');
    }

    return {
        baseUrl,
        apiKey,
        courseSlug,
        timeoutMs: overrides?.timeoutMs ?? 15_000,
    };
}

export function getOptionalDobroApiConfig(): DobroApiConfig | null {
    try {
        return getDobroApiConfig();
    } catch {
        return null;
    }
}

export {
    flattenTrackSlugs,
    getCurriculumTracks,
    getDefaultJornadaCourseSlugs,
    getJornadaCourseSlugsConfig,
    getMainTrackRequiredStartSlugs,
    getPrimaryJornadaCourseSlug,
    isJornadaBoardCourseSlug,
    listCoursesCatalog,
    resolveCourseSlugFromCatalog,
};
