import type { Metadata } from 'next';
import PairGame from './pair-game';

export const metadata: Metadata = { title: 'Role Play เป็นคู่ · SPIN Selling Game' };

export default function PairPage() {
  return <PairGame />;
}
