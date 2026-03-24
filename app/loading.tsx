import AppShellLoading from "@/app/components/layout/AppShellLoading";
import { DefaultContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function DashboardLoading() {
    return (
        <AppShellLoading title="Meu Painel">
            <DefaultContentSkeleton />
        </AppShellLoading>
    );
}
