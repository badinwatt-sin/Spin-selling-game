import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPIN Lab · Consultative Selling Studio',
  description: 'ห้องเรียน SPIN Selling สำหรับตัวแทนประกันชีวิต: Role Play เป็นคู่ เกมทาย SPIN Post-it และ SHOW TIME ทั้งคลาส',
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#00008F' };

const fonts = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Fraunces:ital,opsz,wght@0,9..144,600..800;1,9..144,600..800&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@600..800&display=swap';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={fonts} />
    </head>
    <body>{children}</body>
  </html>;
}
