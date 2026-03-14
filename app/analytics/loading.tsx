import PageSkeleton, { AnalyticsContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function AnalyticsLoading() {
    return (
        <PageSkeleton
            headerTitle="Analytics"
            contentSlot={<AnalyticsContentSkeleton />}
        />
    );
}
