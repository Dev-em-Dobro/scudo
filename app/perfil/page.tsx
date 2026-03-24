import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import ChangePasswordSection from '@/app/components/profile/ChangePasswordSection';
import ProfileEditor from '@/app/components/profile/ProfileEditor';
import { auth } from '@/app/lib/auth';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';

export default async function PerfilPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const profile = await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    const clientProfile = toClientProfile(profile);

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Meu Perfil" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">

                    <ProfileEditor initialProfile={clientProfile} />
                    <ChangePasswordSection />
                </div>
            </main>
        </div>
    );
}
