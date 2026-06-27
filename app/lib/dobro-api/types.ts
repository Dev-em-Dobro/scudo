export type DobroApiPaginationMetadata = {
    totalCount: number;
    hasMore: boolean;
    limit: number;
    offset: number;
};

export type DobroApiCourse = {
    id: number;
    curseducaId: number;
    uuid?: string | null;
    title: string;
    slug?: string | null;
    imageUrl?: string | null;
    categoryName?: string | null;
    categorySlug?: string | null;
    typeName?: string | null;
    workload?: string | null;
    permission?: number | null;
    situation?: number | null;
    createdAtCurseduca?: string | null;
};

export type DobroApiCourseListResponse = {
    metadata: DobroApiPaginationMetadata;
    data: DobroApiCourse[];
};

export type DobroApiLessonInTree = {
    id: number;
    curseducaId: number;
    title: string;
    link?: string | null;
    order: number;
    typeIdentifier?: string | null;
    isQuizEnabled: boolean;
    filePath?: string | null;
};

export type DobroApiModuleInTree = {
    id: number;
    curseducaId: number;
    title: string;
    order: number;
    lessons: DobroApiLessonInTree[];
};

export type DobroApiCourseTree = DobroApiCourse & {
    modules: DobroApiModuleInTree[];
};

export type DobroApiErrorResponse = {
    statusCode: number;
    error: string;
    message: string;
    path: string;
    timestamp: string;
};
