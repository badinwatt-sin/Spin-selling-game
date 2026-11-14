'use client';
import { ArrowRight } from 'lucide-react';
import { api, usePoll } from '@/lib/client';
import { roomName } from '@/lib/rooms';

type Rooms = { rooms: { room: number; label: string | null; activity: string | null; people: number }[] };
const names: Record<string, string> = { quiz: 'เกมทาย SPIN กำลังเล่นอยู่', postit: 'กิจกรรม Post-it กำลังเปิดรับ', feedback: 'SHOW TIME กำลังเริ่ม', recap: 'สรุปผล SHOW TIME' };

// Shows a "join now" banner on the home page while any room has an activity running.
export default function LiveBanner() {
  const { data } = usePoll<Rooms>(() => api('/api/class?as=rooms'), 6000);
  const live = data?.rooms.filter(r => r.activity) ?? [];
  if (!live.length) return null;
  const one = live.length === 1 ? live[0] : null;
  const label = one ? `${names[one.activity!] ?? 'กิจกรรมกำลังเริ่ม'} · ${roomName(one.room, one.label)}` : `กิจกรรมเปิดอยู่ ${live.length} ห้อง`;
  return <a className="live-banner" href={one ? `/class?room=${one.room}` : '/class'}><span className="live-dot">●</span> {label} — เข้าร่วมเลย <ArrowRight size={18} /></a>;
}
