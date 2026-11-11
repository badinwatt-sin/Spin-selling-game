'use client';
import { api, usePoll } from '@/lib/client';
import type { PublicClass } from '@/lib/server/classroom';
import { stages, type StageKey } from '@/lib/spin';
import { StageBadge } from '@/components/ui';

export type ClassView = PublicClass & { admin: boolean; adminReady: boolean };
export type QuizView = Extract<NonNullable<PublicClass['activity']>, { kind: 'quiz' }>;
export type FeedbackView = Extract<NonNullable<PublicClass['activity']>, { kind: 'feedback' }>;

export function useClass(as: 'player' | 'display' | 'admin', delay = 1500) {
  return usePoll<ClassView>(() => api<ClassView>(`/api/class?as=${as}`), delay);
}

export function ChoiceLegend({ compact }: { compact?: boolean }) {
  return <div className={`legend ${compact ? 'legend-compact' : ''}`}>
    {stages.map(s => <div key={s.key} className="legend-item" style={{ '--c': s.color } as React.CSSProperties}>
      <StageBadge k={s.key} />
      <div><b>{s.name}</b><span>{s.meaning}</span></div>
    </div>)}
  </div>;
}

export function stageOf(k: StageKey) { return stages.find(s => s.key === k)!; }

export function Podium({ board }: { board: { pid: string; name: string; score: number; correct: number }[] }) {
  const top = board.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const medal = ['🥈', '🥇', '🥉'];
  const place = [2, 1, 3];
  return <div className="podium">
    {order.map((p, i) => p ? <div key={p.pid} className={`podium-col podium-${place[i]}`}>
      <span className="podium-medal">{medal[i]}</span>
      <b className="podium-name">{p.name}</b>
      <span className="podium-score">{p.score.toLocaleString()} คะแนน</span>
      <span className="podium-correct">ถูก {p.correct} ข้อ</span>
      <div className="podium-block">{place[i]}</div>
    </div> : <div key={i} className="podium-col podium-empty" />)}
  </div>;
}

export function Countdown({ closesAt, openedAt, now }: { closesAt: number | null; openedAt: number | null; now: number }) {
  if (!closesAt || !openedAt) return null;
  const total = closesAt - openedAt, left = Math.max(0, closesAt - now);
  return <div className="countdown">
    <div className="countdown-bar"><span style={{ width: `${(left / total) * 100}%` }} /></div>
    <b className={left < 5000 ? 'low' : ''}>{Math.ceil(left / 1000)}</b>
  </div>;
}
