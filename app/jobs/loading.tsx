import PageSkeleton, { JobsContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function JobsLoading() {
    return (
        <PageSkeleton
            headerTitle="Vagas"
            contentSlot={<JobsContentSkeleton />}
        />
    );
}
