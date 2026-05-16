import PageSkeleton from '@/app/components/layout/PageSkeleton';

export default function Loading() {
    return (
        <PageSkeleton
            headerTitle="Indique e Ganhe"
            contentSlot={
                <div className="space-y-6">
                    <div className="animate-pulse rounded-xl bg-slate-700/60 h-24" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="animate-pulse rounded-xl bg-slate-700/60 h-28" />
                        <div className="animate-pulse rounded-xl bg-slate-700/60 h-28" />
                        <div className="animate-pulse rounded-xl bg-slate-700/60 h-28" />
                    </div>
                    <div className="animate-pulse rounded-xl bg-slate-700/60 h-64" />
                </div>
            }
        />
    );
}
