import AppShellLoading from "@/app/components/layout/AppShellLoading";
import { JobsContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function JobsLoading() {
    return (
        <AppShellLoading title="Vagas para Você">
            <JobsContentSkeleton />
        </AppShellLoading>
    );
}
