import type { Metadata } from 'next';
import Participant from './participant';
export const metadata: Metadata = { title: 'กิจกรรมทั้งคลาส · SPIN Selling Game' };
export default function ClassPage() { return <Participant />; }
