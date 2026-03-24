import AppShellLoading from "@/app/components/layout/AppShellLoading";
import { ProfileContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function PerfilLoading() {
    return (
        <AppShellLoading title="Meu Perfil">
            <ProfileContentSkeleton />
        </AppShellLoading>
    );
}
