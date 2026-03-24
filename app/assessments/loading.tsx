import AppShellLoading from "@/app/components/layout/AppShellLoading";
import { DefaultContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function AssessmentsLoading() {
    return (
        <AppShellLoading title="Teste suas Skills">
            <DefaultContentSkeleton />
        </AppShellLoading>
    );
}
