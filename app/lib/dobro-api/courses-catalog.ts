import jornadaCourseSlugsConfig from '@/app/lib/dobro-api/jornada-course-slugs.json';

import type { DobroApiCatalogCourse } from '@/app/lib/dobro-api/catalog-types';
import coursesCatalog from '@/app/lib/dobro-api/courses.json';

const courses = coursesCatalog as DobroApiCatalogCourse[];

export type CurriculumOrderConstraint = 'strict' | 'flexible' | 'optional-later';

export type CurriculumTrack = {
    id: string;
    title: string;
    order: number;
    orderConstraint: CurriculumOrderConstraint;
    requiredStartSlugs?: string[];
    slugs: string[];
    notes?: string;
};

export type JornadaCourseSlugsConfig = {
    primarySlug: string;
    tracks: CurriculumTrack[];
    slugs?: string[];
    notes?: string;
};

const jornadaConfig = jornadaCourseSlugsConfig as JornadaCourseSlugsConfig;

function assertKnownSlugs(slugs: string[]): string[] {
    const known = new Set(
        courses
            .map((course) => course.slug)
            .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0),
    );

    const invalid = slugs.filter((slug) => !known.has(slug));

    if (invalid.length > 0) {
        throw new Error(
            `Slug(s) da jornada não encontrado(s) em courses.json: ${invalid.join(', ')}`,
        );
    }

    return slugs;
}

export function getCurriculumTracks(): CurriculumTrack[] {
    return [...jornadaConfig.tracks].sort((a, b) => a.order - b.order);
}

export function flattenTrackSlugs(tracks: CurriculumTrack[] = getCurriculumTracks()): string[] {
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const track of tracks) {
        for (const slug of track.slugs) {
            if (!seen.has(slug)) {
                seen.add(slug);
                ordered.push(slug);
            }
        }
    }

    return ordered;
}

export function getJornadaCourseSlugsConfig(): JornadaCourseSlugsConfig {
    return jornadaConfig;
}

/** Slugs do currículo na ordem das trilhas — allowlist explícita. */
export function getDefaultJornadaCourseSlugs(): string[] {
    const fromEnv = (process.env.DOBRO_API_JORNADA_COURSE_SLUGS ?? '')
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean);

    if (fromEnv.length > 0) {
        return assertKnownSlugs(fromEnv);
    }

    if (jornadaConfig.slugs?.length) {
        return assertKnownSlugs(jornadaConfig.slugs);
    }

    return assertKnownSlugs(flattenTrackSlugs());
}

export function getPrimaryJornadaCourseSlug(): string {
    const fromEnv = (process.env.DOBRO_API_COURSE_SLUG ?? '').trim();
    if (fromEnv) {
        return resolveCourseSlugFromCatalog(fromEnv);
    }

    const primary = jornadaConfig.primarySlug;
    assertKnownSlugs([primary]);
    return primary;
}

/** Início obrigatório da trilha principal (Primeiros Passos → Front-end → Back-end). */
export function getMainTrackRequiredStartSlugs(): string[] {
    const main = getCurriculumTracks().find((track) => track.id === 'formacao-fullstack');
    return main?.requiredStartSlugs ?? [];
}

export function isJornadaBoardCourseSlug(slug: string): boolean {
    return getDefaultJornadaCourseSlugs().includes(slug);
}

export function resolveCourseSlugFromCatalog(query?: string | null): string {
    const normalizedQuery = (query ?? '').trim();

    if (normalizedQuery) {
        const exact = courses.find((course) => course.slug === normalizedQuery);
        if (exact?.slug) {
            return exact.slug;
        }

        const queryLower = normalizedQuery.toLowerCase();
        const jornadaSlugs = new Set(getDefaultJornadaCourseSlugs());
        const matches = courses.filter(
            (course) =>
                course.slug?.toLowerCase().includes(queryLower) ||
                course.title.toLowerCase().includes(queryLower),
        );

        if (matches.length === 1 && matches[0].slug) {
            return matches[0].slug;
        }

        if (matches.length > 1) {
            const inJornada = matches.filter((course) => course.slug && jornadaSlugs.has(course.slug));
            if (inJornada.length === 1 && inJornada[0].slug) {
                return inJornada[0].slug;
            }

            const primary = matches.find((course) => course.slug === jornadaConfig.primarySlug);
            if (primary?.slug) {
                return primary.slug;
            }

            throw new Error(
                `Slug "${normalizedQuery}" é ambíguo (${matches.length} cursos). Use o slug completo.`,
            );
        }

        throw new Error(`Slug "${normalizedQuery}" não encontrado no catálogo local de cursos.`);
    }

    return getPrimaryJornadaCourseSlug();
}

export type DobroApiCatalogCourseSummary = {
    slug: string;
    title: string;
    curseducaId: number;
    inJornadaBoard: boolean;
    trackId?: string;
    trackTitle?: string;
    trackOrder?: number;
};

export function listCoursesCatalog(): DobroApiCatalogCourseSummary[] {
    const jornadaSlugs = new Set(getDefaultJornadaCourseSlugs());
    const slugToTrack = new Map<string, CurriculumTrack>();

    for (const track of getCurriculumTracks()) {
        for (const slug of track.slugs) {
            slugToTrack.set(slug, track);
        }
    }

    return courses
        .filter((course): course is DobroApiCatalogCourse & { slug: string } => Boolean(course.slug))
        .map((course) => {
            const track = slugToTrack.get(course.slug);

            return {
                slug: course.slug,
                title: course.title,
                curseducaId: course.curseduca_id,
                inJornadaBoard: jornadaSlugs.has(course.slug),
                trackId: track?.id,
                trackTitle: track?.title,
                trackOrder: track?.order,
            };
        })
        .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

export function findCourseBySlug(slug: string): DobroApiCatalogCourse | null {
    return courses.find((course) => course.slug === slug) ?? null;
}
