import AppShellLoading from "@/app/components/layout/AppShellLoading";
import { AnalyticsContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function AnalyticsLoading() {
    return (
        <AppShellLoading title="Radar de Mercado">
            <AnalyticsContentSkeleton />
        </AppShellLoading>
    );
}
