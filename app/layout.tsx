import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { auth } from '@/app/lib/auth';
import { AuthProvider } from '@/app/providers/AuthProvider';
import './globals.css';

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    variable: '--font-jetbrains-mono',
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
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
                    rel="stylesheet"
                />
            </head>
            <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
                <AuthProvider initialSession={initialSession}>{children}</AuthProvider>
            </body>
        </html>
    );
}

