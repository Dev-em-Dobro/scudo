export type DobroApiCatalogCourse = {
    id: number;
    curseduca_id: number;
    uuid?: string | null;
    title: string;
    slug: string | null;
    description?: string | null;
    image_url?: string | null;
    category_name?: string | null;
    category_slug?: string | null;
    type_name?: string | null;
    permission?: number | null;
    situation?: number | null;
};

export type DobroApiCatalogCourseSummary = {
    slug: string;
    title: string;
    curseducaId: number;
};
