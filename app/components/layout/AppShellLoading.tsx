import Header from "@/app/components/layout/Header";
import Sidebar from "@/app/components/layout/Sidebar";

interface AppShellLoadingProps {
    readonly title: string;
    readonly children: React.ReactNode;
}

export default function AppShellLoading({ title, children }: Readonly<AppShellLoadingProps>) {
    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-surface-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-surface-dark">
                <Header title={title} />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 scrollbar-modern">
                    {children}
                </div>
            </main>
        </div>
    );
}
