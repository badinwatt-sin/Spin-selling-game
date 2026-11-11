'use client';
import { ArrowRight } from 'lucide-react';
import { api, usePoll } from '@/lib/client';

// Shows a "join now" banner on the home page while the trainer has an activity running.
export default function LiveBanner() {
  const { data } = usePoll<{ activity: { kind: string } | null }>(() => api('/api/class?as=player'), 5000);
  if (!data?.activity) return null;
  const label = data.activity.kind === 'quiz' ? 'เกมทาย SPIN กำลังเล่นอยู่' : 'กิจกรรม Feedback กำลังเริ่ม';
  return <a className="live-banner" href="/class"><span className="live-dot">●</span> {label} — เข้าร่วมเลย <ArrowRight size={18} /></a>;
}
