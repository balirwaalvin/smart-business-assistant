import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LangProvider } from '@/contexts/LangContext';
import PwaRegistrar from '@/components/PwaRegistrar';
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tunda.app';

const metadataBase = (() => {
  try {
    return new URL(siteUrl);
  } catch {
    return undefined;
  }
})();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase,
  title: "TUNDA Business Assistant",
  description: "TUNDA AI — AI-powered business intelligence for SMEs",
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  applicationName: 'TUNDA Business Assistant',
  openGraph: {
    title: 'TUNDA Business Assistant',
    description: 'TUNDA AI — AI-powered business intelligence for SMEs',
    type: 'website',
    siteName: 'TUNDA Business Assistant',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'TUNDA Business Assistant preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TUNDA Business Assistant',
    description: 'TUNDA AI — AI-powered business intelligence for SMEs',
    images: ['/twitter-image'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TUNDA Business Assistant',
  },
  icons: {
    icon: '/TUNDA Favicon.png',
    shortcut: '/TUNDA Favicon.png',
    apple: '/TUNDA Favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LangProvider>
          {children}
          <PwaRegistrar />
        </LangProvider>
      </body>
    </html>
  );
}
