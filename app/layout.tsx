import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cizquake Dashboard',
  description: 'Laporan dan rekap operasional Cizquake',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f5b301' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
