import { LOGO_TEXT } from "@/app/lib/constants";
import ScudoShieldIcon from "@/app/components/layout/ScudoShieldIcon";

function SkeletonBlock({ className }: Readonly<{ className?: string }>) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-slate-700/60 ${className ?? ""}`}
        />
    );
}

interface PageSkeletonProps {
    contentSlot?: React.ReactNode;
    headerTitle?: string;
}

export default function PageSkeleton({ contentSlot, headerTitle }: Readonly<PageSkeletonProps>) {
    return (
        <div className="min-h-screen flex dark bg-background-dark text-white font-sans antialiased">
            {/* Sidebar skeleton */}
            <aside className="w-64 bg-background-dark border-r border-border-dark shrink-0 hidden lg:flex flex-col">
                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-border-dark gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
                        <ScudoShieldIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-base text-white tracking-tight">
                        {LOGO_TEXT.main}
                        <span className="text-primary">{LOGO_TEXT.accent}</span>
                    </span>
                </div>

                {/* Nav items skeleton */}
                <nav className="flex-1 pl-3 pr-0 py-5 space-y-2">
                    <SkeletonBlock className="h-10 mx-1" />
                    <SkeletonBlock className="h-10 mx-1" />
                    <SkeletonBlock className="h-10 mx-1" />
                    <SkeletonBlock className="h-10 mx-1" />
                    <SkeletonBlock className="h-10 mx-1" />
                    <SkeletonBlock className="h-10 mx-1" />
                </nav>

                {/* User skeleton */}
                <div className="p-4 border-t border-border-dark flex items-center gap-3">
                    <SkeletonBlock className="h-9 w-9 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <SkeletonBlock className="h-3.5 w-28" />
                        <SkeletonBlock className="h-3 w-20" />
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-dark">
                {/* Header skeleton */}
                <header className="h-16 border-b border-border-dark flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        {headerTitle ? (
                            <h1 className="text-base font-bold text-white">{headerTitle}</h1>
                        ) : (
                            <SkeletonBlock className="h-5 w-40" />
                        )}
                    </div>
                    <SkeletonBlock className="h-9 w-9 rounded-lg" />
                </header>

                {/* Content area */}
                <div className="flex-1 overflow-auto p-6 md:p-8">
                    {contentSlot ?? <DefaultContentSkeleton />}
                </div>
            </main>
        </div>
    );
}

export function DefaultContentSkeleton() {
    return (
        <div className="space-y-6">
            <SkeletonBlock className="h-4 w-64" />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-5">
                    <SkeletonBlock className="h-32" />
                    <SkeletonBlock className="h-48" />
                    <SkeletonBlock className="h-64" />
                </div>
                <div className="space-y-4">
                    <SkeletonBlock className="h-5 w-40" />
                    <SkeletonBlock className="h-28" />
                    <SkeletonBlock className="h-28" />
                    <SkeletonBlock className="h-28" />
                </div>
            </div>
        </div>
    );
}

export function JobsContentSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <SkeletonBlock className="h-10 flex-1" />
                <SkeletonBlock className="h-10 w-32" />
            </div>
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
        </div>
    );
}

export function ProfileContentSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <ProfileSection id="profile-sec-1" />
            <ProfileSection id="profile-sec-2" />
            <ProfileSection id="profile-sec-3" />
            <ProfileSection id="profile-sec-4" />
        </div>
    );
}

function ProfileSection({ id }: Readonly<{ id: string }>) {
    return (
        <div id={id} className="bg-surface-dark border border-border-dark rounded-xl p-5 space-y-3">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
        </div>
    );
}

export function JornadaContentSkeleton() {
    return (
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
            <KanbanColumn id="col-1" />
            <KanbanColumn id="col-2" />
            <KanbanColumn id="col-3" />
            <KanbanColumn id="col-4" />
        </div>
    );
}

function KanbanColumn({ id }: Readonly<{ id: string }>) {
    return (
        <div id={id} className="shrink-0 w-72 space-y-3">
            <SkeletonBlock className="h-8 w-32" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
        </div>
    );
}

export function AnalyticsContentSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
            </div>
            <SkeletonBlock className="h-64" />
            <SkeletonBlock className="h-48" />
        </div>
    );
}
