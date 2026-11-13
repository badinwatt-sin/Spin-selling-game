'use client';
import { useLayoutEffect, useRef } from 'react';
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

export type WallNote = { pid?: string; name: string; text: string; star: boolean };

// One Post-it. Text always wraps inside the note (even long unbroken strings) and is clamped;
// the trainer opens the full text with the spotlight.
export function PostitCard({ n, color, i, onOpen, onStar, big, fresh, fit }: {
  n: WallNote; color: string; i: number; onOpen?: () => void; onStar?: () => void; big?: boolean; fresh?: boolean; fit?: boolean;
}) {
  const style = { '--c': color, '--r': `${((i * 37) % 5) - 2}deg` } as React.CSSProperties;
  const noteRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  // On the projector each note has a fixed cell: show as many whole lines as fit, then "…".
  useLayoutEffect(() => {
    if (!fit) return;
    const note = noteRef.current, text = textRef.current;
    if (!note || !text) return;
    const apply = () => {
      const cs = getComputedStyle(note), ts = getComputedStyle(text);
      const foot = note.querySelector<HTMLElement>('.postit-foot')?.offsetHeight ?? 0;
      const free = note.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - foot - parseFloat(cs.rowGap || '0');
      const line = parseFloat(ts.lineHeight) || parseFloat(ts.fontSize) * 1.45;
      text.style.setProperty('-webkit-line-clamp', String(Math.max(1, Math.floor(free / line))));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(note);
    return () => ro.disconnect();
  }, [fit, n.text]);
  return <div ref={noteRef} className={`postit-note ${n.star ? 'star' : ''} ${big ? 'postit-big' : ''} ${fresh ? 'postit-fresh' : ''} ${fit ? 'postit-fit' : ''}`} style={style}>
    {onOpen ? <button type="button" className="postit-open" onClick={onOpen} aria-label={`เปิดดู Post-it ของ ${n.name}`}>
      <span ref={textRef} className="postit-text">{n.text}</span>
    </button> : <span ref={textRef} className="postit-text">{n.text}</span>}
    <span className="postit-foot">
      <small>{n.name}</small>
      {onStar ? <button type="button" className={`postit-star ${n.star ? 'on' : ''}`} onClick={onStar} aria-pressed={n.star} aria-label={n.star ? 'เอาดาวออก' : 'ติดดาว'}>★</button>
        : n.star && <span className="postit-star on" aria-label="ติดดาว">★</span>}
    </span>
  </div>;
}

// Full-screen spotlight of a single note, large enough to read from the back of the room.
export function PostitSpotlight({ n, color, stage, onClose, onStar, onPrev, onNext }: {
  n: WallNote; color: string; stage: string; onClose?: () => void; onStar?: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  return <div className="spotlight" role="dialog" aria-modal="true" aria-label={`Post-it ของ ${n.name}`}>
    <div className="spotlight-note" style={{ '--c': color } as React.CSSProperties}>
      <span className="spotlight-stage">{stage}</span>
      <p>{n.text}</p>
      <footer><b>— {n.name}</b>{n.star && <span className="spotlight-star">★ คำถามตัวอย่างที่ดี</span>}</footer>
    </div>
    {(onClose || onStar || onPrev || onNext) && <div className="spotlight-actions">
      {onPrev && <button type="button" className="btn btn-ghost" onClick={onPrev}>‹ ก่อนหน้า</button>}
      {onStar && <button type="button" className="btn btn-ghost" onClick={onStar}>{n.star ? '★ เอาดาวออก' : '☆ ติดดาว'}</button>}
      {onClose && <button type="button" className="btn btn-primary" onClick={onClose}>ปิด (Esc)</button>}
      {onNext && <button type="button" className="btn btn-ghost" onClick={onNext}>ถัดไป ›</button>}
    </div>}
  </div>;
}
