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
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Admin · Resgates MGM" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 scrollbar-modern">
                    <div className="mx-auto w-full max-w-6xl">
                        <RedemptionAdminList pending={pending} recent={recent} />
                    </div>
                </div>
            </main>
        </div>
    );
}
