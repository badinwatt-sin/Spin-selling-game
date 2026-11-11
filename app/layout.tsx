import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPIN Selling Game · Role Play Lab',
  description: 'From better questions to bigger cases. ฝึก SPIN Selling สำหรับตัวแทนประกันชีวิต: Role Play เป็นคู่ เกมทาย SPIN และ Feedback ทั้งคลาส',
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#071d48' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th"><body>{children}</body></html>;
}
