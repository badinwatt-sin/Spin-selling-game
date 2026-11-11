'use client';
import { api, usePoll } from '@/lib/client';
import type { PublicClass } from '@/lib/server/classroom';
import { criterionColor, stages, type StageKey } from '@/lib/spin';
import { StageBadge } from '@/components/ui';

export type ClassView = PublicClass & { admin: boolean; adminReady: boolean; names?: string[] };
export type QuizView = Extract<NonNullable<PublicClass['activity']>, { kind: 'quiz' }>;
export type FeedbackView = Extract<NonNullable<PublicClass['activity']>, { kind: 'feedback' }>;
export type PostitView = Extract<NonNullable<PublicClass['activity']>, { kind: 'postit' }>;
export type ShowtimeRow = PublicClass['showtime'][number];

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

export function Podium({ board }: { board: { pid: string; name: string; score: number; correct: number; hidden?: boolean }[] }) {
  const top = board.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const medal = ['🥈', '🥇', '🥉'];
  const place = [2, 1, 3];
  return <div className="podium">
    {order.map((p, i) => p ? <div key={p.pid} className={`podium-col podium-${place[i]} ${p.hidden ? 'podium-hidden' : 'podium-show'}`}>
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
    <b className={left < 5000 ? 'low' : ''}>{Math.ceil(left / 1000)}<small> วิ</small></b>
  </div>;
}

// SHOW TIME recap: every pair that presented, ranked by the class's average score.
export function ShowtimeTable({ rows, big }: { rows: ShowtimeRow[]; big?: boolean }) {
  if (!rows.length) return null;
  return <ol className={`showtime ${big ? 'showtime-big' : ''}`}>
    {rows.map((r, i) => <li key={r.id}>
      <span className="showtime-rank">{['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`}</span>
      <div className="showtime-who"><b>{r.advisor}</b><small>{r.customer ? `คู่กับ ${r.customer}` : ''}{r.scenarioTitle ? ` · ลูกค้า${r.scenarioTitle}` : ''} · {r.count} คนประเมิน</small></div>
      <div className="showtime-mini" aria-hidden="true">{r.criteria.map((c, j) => <i key={j} style={{ height: `${((c ?? 0) / 5) * 100}%`, background: criterionColor(j) }} />)}</div>
      <b className="showtime-score">{r.overall ?? '–'}</b>
    </li>)}
  </ol>;
}
