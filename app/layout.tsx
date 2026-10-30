import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Martian_Mono, Orbitron, Ubuntu } from 'next/font/google';
import Script from 'next/script';

import { auth } from '@/app/lib/auth';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { SidebarProvider } from '@/app/providers/SidebarProvider';
import DailyStreakAnnouncementModal from '@/app/components/tutorial/DailyStreakAnnouncementModal';
import TutorialVideoModal from '@/app/components/tutorial/TutorialVideoModal';
import { TutorialProvider } from '@/app/providers/TutorialProvider';
import './globals.css';
import 'driver.js/dist/driver.css';

const ubuntu = Ubuntu({
    variable: '--font-ubuntu',
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const martianMono = Martian_Mono({
    variable: '--font-martian-mono',
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const orbitron = Orbitron({
    variable: '--font-orbitron',
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Scudo - Seu painel de carreira',
    description: 'Plataforma para desenvolvedores evoluírem na carreira com vagas alinhadas ao seu perfil',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth.api.getSession({ headers: await headers() });

    const initialSession = session?.user
        ? {
            user: {
                name: session.user.name ?? null,
                email: session.user.email ?? null,
                image: session.user.image ?? null,
            },
        }
        : null;

    return (
        <html lang="pt-BR" className="dark">
            <body className={`${ubuntu.variable} ${martianMono.variable} ${orbitron.variable} antialiased`}>
                <AuthProvider initialSession={initialSession}>
                    <SidebarProvider>
                        <TutorialProvider>
                            {children}
                            <TutorialVideoModal />
                            <DailyStreakAnnouncementModal />
                        </TutorialProvider>
                    </SidebarProvider>
                </AuthProvider>
                {/* [Black] Popup da oferta de alunos da Black Infinita — só pra aluno logado */}
                {session?.user && <Script src="/black-popup.js" strategy="afterInteractive" />}
            </body>
        </html>
    );
}

