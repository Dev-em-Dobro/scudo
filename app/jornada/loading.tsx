import AppShellLoading from "@/app/components/layout/AppShellLoading";
import { JornadaContentSkeleton } from "@/app/components/layout/PageSkeleton";

export default function JornadaLoading() {
    return (
        <AppShellLoading title="Jornada do aluno">
            <JornadaContentSkeleton />
        </AppShellLoading>
    );
}
