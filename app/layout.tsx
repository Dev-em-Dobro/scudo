import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
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
    title: 'CareerQuest - Seu painel de carreira',
    description: 'Plataforma para desenvolvedores evoluírem na carreira com vagas alinhadas ao seu perfil',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" className="dark">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
                    rel="stylesheet"
                />
            </head>
            <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}

