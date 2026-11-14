import type { Metadata } from 'next';
import Notebook from './notebook';
export const metadata: Metadata = { title: 'สมุด Post-it · SPIN Selling Game' };
export default function BoardPage() { return <Notebook />; }
