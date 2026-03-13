import PageSkeleton, { ProfileContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function PerfilLoading() {
    return (
        <PageSkeleton
            headerTitle="Meu Perfil"
            contentSlot={<ProfileContentSkeleton />}
        />
    );
}
