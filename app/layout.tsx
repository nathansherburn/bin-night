import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Bin Night',
  description: 'Monash Council bin collection schedule',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bin Night',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="theme-color" content="#f1f5f9" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen text-slate-800 antialiased">{children}</body>
    </html>
  );
}
