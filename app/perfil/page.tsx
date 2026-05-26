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
        <div className="min-h-screen flex dark bg-black text-white [font-family:'Ubuntu',Helvetica] antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-black">
                <Header title="Meu Perfil" />

                <div className="flex-1 overflow-visible lg:overflow-auto scrollbar-modern">
                    <div className="w-full px-6 md:px-8 py-10 md:py-14 space-y-12">
                        <section>
                            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                                Meu perfil_
                            </span>
                            <h1 className="mt-4 text-3xl md:text-[40px] font-black text-white leading-[1.1] [font-family:'Ubuntu',Helvetica]">
                                Mantenha seu perfil afiado
                            </h1>
                            <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                                Quanto mais completo o perfil, melhor o matching das vagas e a leitura do mercado.
                            </p>
                        </section>

                        <ProfileEditor initialProfile={clientProfile} />
                        <ChangePasswordSection />
                    </div>
                </div>
            </main>
        </div>
    );
}
