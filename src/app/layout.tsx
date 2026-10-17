import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEX3 — Blockchain protocol for institution.',
  description: 'Infrastructure that helps enterprises seamlessly connect with the blockchain economy.',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
