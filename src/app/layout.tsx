import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LangProvider } from '@/contexts/LangContext';
import PwaRegistrar from '@/components/PwaRegistrar';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tunda Business Assistant",
  description: "TUNDA AI — AI-powered business intelligence for SMEs",
  manifest: '/manifest.webmanifest',
  applicationName: 'Tunda Business Assistant',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tunda Business Assistant',
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
