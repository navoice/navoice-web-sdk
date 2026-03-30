import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { NavoiceShell } from '@/components/NavoiceShell';

export const metadata: Metadata = {
  title: 'MyCity',
  description: 'MyCity voice-driven demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="/navoice.min.js" strategy="beforeInteractive" />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
          rel="stylesheet"
        />
      </head>

      <body className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-24 md:pb-0">
        {children}
        <NavoiceShell />
      </body>
    </html>
  );
}