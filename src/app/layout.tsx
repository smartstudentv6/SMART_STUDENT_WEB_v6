
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/contexts/app-provider';

export const metadata: Metadata = {
  title: 'SMART STUDENT',
  description: 'SMART STUDENT - Aprende, Crea y Destaca',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning={true}>
      <head>
        <link rel="icon" href="/favicon.ico?t=1734438000" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico?t=1734438000" type="image/x-icon" />
        <link rel="icon" href="/favicon_v2.ico?t=1734438000" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/favicon_v2.ico?t=1734438000" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?t=1734438000" sizes="16x16" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?t=1734438000" sizes="32x32" />
        <meta name="msapplication-TileImage" content="/favicon_v2.ico?t=1734438000" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
