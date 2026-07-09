import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PersonalAssist — AI Dashboard',
  description: 'Your personal assistant dashboard for tasks, finances, and activities.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/logo.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo.png?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PersonalAssist',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#040814',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=2" />
        <link rel="icon" type="image/png" sizes="512x512" href="/logo.png?v=2" />
        <link rel="apple-touch-icon" sizes="512x512" href="/logo.png?v=2" />
      </head>
      <body className="min-h-full flex flex-col relative">
        {children}
      </body>
    </html>
  );
}
