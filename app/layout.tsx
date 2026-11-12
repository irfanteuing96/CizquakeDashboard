import type { Metadata, Viewport } from 'next';
import { Montserrat, Quicksand } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-montserrat' });
const quicksand = Quicksand({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-quicksand' });

export const metadata: Metadata = {
  title: 'Cizquake Dashboard',
  description: 'Laporan dan rekap operasional Cizquake',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fabd00' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${montserrat.variable} ${quicksand.variable}`}>
      <body className="font-sans font-medium antialiased">{children}</body>
    </html>
  );
}
