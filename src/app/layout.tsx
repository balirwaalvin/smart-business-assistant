import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { LangProvider } from '@/contexts/LangContext';
import PwaRegistrar from '@/components/PwaRegistrar';
import "./globals.css";
import "./tunda-product.css";
import "./tunda-views.css";
import "./tunda-fixes.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tunda.app';

const metadataBase = (() => {
  try {
    return new URL(siteUrl);
  } catch {
    return undefined;
  }
})();

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase,
  title: "Tunda Business — Know what to do next",
  description: "Plain-language business records, live financial clarity, and useful next steps for small businesses.",
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  applicationName: 'TUNDA Business Assistant',
  openGraph: {
    title: 'TUNDA Business Assistant',
    description: 'Plain-language business records, live financial clarity, and useful next steps for small businesses.',
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
    description: 'Plain-language business records, live financial clarity, and useful next steps for small businesses.',
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
  themeColor: '#102a56',
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
        className={`${manrope.variable} ${spaceGrotesk.variable}`}
      >
        <LangProvider>
          {children}
          <PwaRegistrar />
        </LangProvider>
      </body>
    </html>
  );
}
