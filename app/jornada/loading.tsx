import PageSkeleton, { JornadaContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function JornadaLoading() {
    return (
        <PageSkeleton
            headerTitle="Minha Jornada"
            contentSlot={<JornadaContentSkeleton />}
        />
    );
}
