import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import { auth } from '@/app/lib/auth';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isMgmAdmin } from '@/app/lib/mgm/adminAuth';
import { adminListRedemptions } from '@/app/lib/mgm/redemptions';
import RedemptionAdminList from '@/app/admin/mgm-redemptions/components/RedemptionAdminList';

export const dynamic = 'force-dynamic';

export default async function MgmRedemptionsAdminPage() {
    if (!isMgmEnabled()) {
        redirect('/');
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        redirect('/login?callbackUrl=/admin/mgm-redemptions');
    }

    if (!isMgmAdmin(session.user.email)) {
        redirect('/');
    }

    const [pending, recent] = await Promise.all([
        adminListRedemptions({ status: ['requested', 'approved'], limit: 100 }),
        adminListRedemptions({ status: ['delivered', 'rejected', 'cancelled'], limit: 50 }),
    ]);

    return (
        <div className="min-h-screen flex dark bg-black text-white [font-family:'Ubuntu',Helvetica] antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-black">
                <Header title="Admin · Resgates MGM" />

                <div className="flex-1 overflow-visible lg:overflow-auto scrollbar-modern">
                    <div className="w-full px-6 md:px-8 py-10 md:py-14 space-y-12">
                        <section>
                            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ff6b35] [font-family:'Ubuntu',Helvetica]">
                                Admin_
                            </span>
                            <h1 className="mt-4 text-3xl md:text-[40px] font-black text-white leading-[1.1] [font-family:'Ubuntu',Helvetica]">
                                Resgates do MGM
                            </h1>
                            <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                                Aprove, entregue e gerencie resgates de prêmios dos alunos.
                            </p>
                        </section>

                        <RedemptionAdminList pending={pending} recent={recent} />
                    </div>
                </div>
            </main>
        </div>
    );
}
