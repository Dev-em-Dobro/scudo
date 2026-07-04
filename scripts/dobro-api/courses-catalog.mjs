import fs from "node:fs";
import path from "node:path";

const DEFAULT_CATALOG_PATH = "app/lib/dobro-api/courses.json";
const LEGACY_CATALOG_PATH = "scripts/courses.json";
const JORNADA_SLUGS_PATH = "app/lib/dobro-api/jornada-course-slugs.json";

/** @typedef {{ id: number; curseduca_id: number; title: string; slug: string | null; [key: string]: unknown }} CatalogCourse */
/** @typedef {{ id: string; title: string; order: number; orderConstraint: string; requiredStartSlugs?: string[]; slugs: string[]; notes?: string }} CurriculumTrack */
/** @typedef {{ primarySlug: string; tracks: CurriculumTrack[]; slugs?: string[]; notes?: string }} JornadaCourseSlugsConfig */

let cachedCourses = null;
let cachedJornadaConfig = null;

export function getCoursesCatalogPath() {
    const configured = (process.env.DBOBRO_API_COURSES_CATALOG_PATH ?? process.env.DBOBRO_API_COURSES_CATALOG_PATH ?? "").trim();

    if (configured) {
        return path.resolve(process.cwd(), configured);
    }

    const primary = path.resolve(process.cwd(), DEFAULT_CATALOG_PATH);
    if (fs.existsSync(primary)) {
        return primary;
    }

    return path.resolve(process.cwd(), LEGACY_CATALOG_PATH);
}

function getJornadaSlugsPath() {
    const configured = (process.env.DBOBRO_API_JORNADA_SLUGS_PATH ?? process.env.DBOBRO_API_JORNADA_SLUGS_PATH ?? "").trim();
    return path.resolve(process.cwd(), configured || JORNADA_SLUGS_PATH);
}

/** @returns {CatalogCourse[]} */
export function loadCoursesCatalog() {
    if (cachedCourses) {
        return cachedCourses;
    }

    const catalogPath = getCoursesCatalogPath();

    if (!fs.existsSync(catalogPath)) {
        throw new Error(
            `Catálogo de cursos não encontrado em ${catalogPath}. Exporte da dobro-api ou defina DOBRO_API_COURSES_CATALOG_PATH.`,
        );
    }

    const parsed = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

    if (!Array.isArray(parsed)) {
        throw new Error(`Catálogo inválido em ${catalogPath}: esperado array JSON.`);
    }

    cachedCourses = parsed;
    return cachedCourses;
}

/** @returns {JornadaCourseSlugsConfig} */
export function loadJornadaCourseSlugsConfig() {
    if (cachedJornadaConfig) {
        return cachedJornadaConfig;
    }

    const configPath = getJornadaSlugsPath();

    if (!fs.existsSync(configPath)) {
        throw new Error(`Allowlist da jornada não encontrada em ${configPath}.`);
    }

    cachedJornadaConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return cachedJornadaConfig;
}

/** @param {string[]} slugs @param {CatalogCourse[]} courses */
function assertKnownSlugs(slugs, courses = loadCoursesCatalog()) {
    const known = new Set(
        courses.map((course) => course.slug).filter((slug) => typeof slug === "string" && slug.length > 0),
    );
    const invalid = slugs.filter((slug) => !known.has(slug));

    if (invalid.length > 0) {
        throw new Error(`Slug(s) da jornada não encontrado(s) em courses.json: ${invalid.join(", ")}`);
    }

    return slugs;
}

/** @returns {CurriculumTrack[]} */
export function getCurriculumTracks() {
    const { tracks } = loadJornadaCourseSlugsConfig();
    return [...tracks].sort((a, b) => a.order - b.order);
}

/** @param {CurriculumTrack[]} tracks */
export function flattenTrackSlugs(tracks = getCurriculumTracks()) {
    const seen = new Set();
    const ordered = [];

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

/** @param {CatalogCourse[]} courses */
export function getPrimaryJornadaCourseSlug(courses = loadCoursesCatalog()) {
    const fromEnv = (process.env.DBOBRO_API_COURSE_SLUG ?? process.env.DBOBRO_API_COURSE_SLUG ?? "").trim();
    if (fromEnv) {
        return resolveCourseSlugFromCatalog(fromEnv, courses);
    }

    const { primarySlug } = loadJornadaCourseSlugsConfig();
    assertKnownSlugs([primarySlug], courses);
    return primarySlug;
}

/** @param {CatalogCourse[]} courses */
export function getDefaultJornadaCourseSlugs(courses = loadCoursesCatalog()) {
    const fromEnv = (process.env.DBOBRO_API_JORNADA_COURSE_SLUGS ?? process.env.DBOBRO_API_JORNADA_COURSE_SLUGS ?? "")
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);

    if (fromEnv.length > 0) {
        return assertKnownSlugs(fromEnv, courses);
    }

    const config = loadJornadaCourseSlugsConfig();
    if (config.slugs?.length) {
        return assertKnownSlugs(config.slugs, courses);
    }

    return assertKnownSlugs(flattenTrackSlugs(config.tracks), courses);
}

export function getMainTrackRequiredStartSlugs() {
    const main = getCurriculumTracks().find((track) => track.id === "formacao-fullstack");
    return main?.requiredStartSlugs ?? [];
}

export function isJornadaBoardCourseSlug(slug) {
    return getDefaultJornadaCourseSlugs().includes(slug);
}

/**
 * @param {string | undefined | null} query
 * @param {CatalogCourse[]} courses
 */
export function resolveCourseSlugFromCatalog(query, courses = loadCoursesCatalog()) {
    const normalizedQuery = (query ?? "").trim();
    const jornadaConfig = loadJornadaCourseSlugsConfig();
    const jornadaSlugs = new Set(getDefaultJornadaCourseSlugs(courses));

    if (normalizedQuery) {
        const exact = courses.find((course) => course.slug === normalizedQuery);
        if (exact?.slug) {
            return exact.slug;
        }

        const queryLower = normalizedQuery.toLowerCase();
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

        throw new Error(
            `Slug "${normalizedQuery}" não encontrado no catálogo local (${getCoursesCatalogPath()}).`,
        );
    }

    return getPrimaryJornadaCourseSlug(courses);
}

export function listCoursesCatalog() {
    const jornadaSlugs = new Set(getDefaultJornadaCourseSlugs());
    const slugToTrack = new Map();

    for (const track of getCurriculumTracks()) {
        for (const slug of track.slugs) {
            slugToTrack.set(slug, track);
        }
    }

    return loadCoursesCatalog()
        .filter((course) => course.slug)
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
                orderConstraint: track?.orderConstraint,
            };
        })
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}
