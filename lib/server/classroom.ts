// Whole-class activities: pure state logic (no I/O).
//  1) SPIN quiz — "Is this line S, P, I or N?" Fast + correct answers score more; top 3 podium.
//  2) Peer feedback — the class scores the Advisor of one pair who role-plays in front of the room.
import { randomUUID } from 'node:crypto';
import { GameError } from './game.ts';
import { quizBank } from './quiz-bank.ts';
import { personas } from './personas.ts';
import { improveTags, strengthTags, type StageKey } from '../spin.ts';

export const choices: StageKey[] = ['S', 'P', 'I', 'N'];
export const classLifetime = 10 * 3600_000;

export type Score = { name: string; score: number; correct: number; ms: number; last: number; streak: number };
export type Reveal = {
  index: number; answer: StageKey; why: string; answered: number;
  counts: Record<StageKey, number>; fastest: { name: string; ms: number }[];
};
export type QuizActivity = {
  kind: 'quiz'; id: string; phase: 'lobby' | 'question' | 'reveal' | 'final';
  order: number[]; timeLimit: number; index: number; openedAt: number | null; closesAt: number | null;
  scores: Record<string, Score>; reveal: Reveal | null;
};
export type FeedbackSummary = {
  count: number; overall: number | null; criteria: (number | null)[];
  strengths: { tag: string; count: number }[]; improves: { tag: string; count: number }[];
  notes: { good: string; tip: string }[];
};
export type FeedbackActivity = {
  kind: 'feedback'; id: string; phase: 'roleplay' | 'voting' | 'results';
  advisor: string; customer: string; scenario: number | null;
  startedAt: number; endedAt: number | null; summary: FeedbackSummary | null;
};
export type ClassState = {
  id: string; startedAt: number; expiresAt: number;
  activity: QuizActivity | FeedbackActivity | null;
};

export type Answer = { pid: string; name: string; choice: StageKey; ms: number };
export type Ballot = { scores: number[]; strengths: string[]; improves: string[]; good: string; tip: string };

const bad = (message: string, status = 409): never => { throw new GameError(message, status); };
const text = (v: unknown, n: number) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';

export function newClass(now = Date.now()): ClassState {
  return { id: randomUUID().slice(0, 8), startedAt: now, expiresAt: now + classLifetime, activity: null };
}

export function shuffle<T>(items: T[], random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function points(correct: boolean, ms: number, limitMs: number) {
  if (!correct) return 0;
  const t = Math.min(Math.max(ms, 0), limitMs);
  return Math.round(1000 - 500 * (t / limitMs));
}

// Earliest answer per person wins; answers after the deadline (plus a small network grace) are ignored.
export function scoreQuestion(quiz: QuizActivity, answers: Answer[]): QuizActivity {
  const item = quizBank.find(q => q.id === quiz.order[quiz.index]);
  if (!item) return bad('ไม่พบคำถาม');
  const limitMs = quiz.timeLimit * 1000;
  const first = new Map<string, Answer>();
  for (const a of [...answers].sort((x, y) => x.ms - y.ms)) {
    if (a.ms <= limitMs + 1500 && !first.has(a.pid)) first.set(a.pid, a);
  }
  const scores = structuredClone(quiz.scores);
  const counts: Record<StageKey, number> = { S: 0, P: 0, I: 0, N: 0 };
  for (const s of Object.values(scores)) s.last = 0;
  for (const a of first.values()) {
    counts[a.choice]++;
    const ok = a.choice === item.answer;
    const s = scores[a.pid] ??= { name: a.name, score: 0, correct: 0, ms: 0, last: 0, streak: 0 };
    s.name = a.name;
    s.last = points(ok, a.ms, limitMs);
    s.score += s.last;
    if (ok) { s.correct++; s.ms += Math.min(a.ms, limitMs); s.streak++; } else s.streak = 0;
  }
  for (const [pid, s] of Object.entries(scores)) if (!first.has(pid)) s.streak = 0;
  const fastest = [...first.values()].filter(a => a.choice === item.answer).slice(0, 3)
    .map(a => ({ name: a.name, ms: Math.min(a.ms, limitMs) }));
  return {
    ...quiz, phase: 'reveal', closesAt: Math.min(quiz.closesAt ?? Date.now(), Date.now()), scores,
    reveal: { index: quiz.index, answer: item.answer, why: item.why, answered: first.size, counts, fastest },
  };
}

export function leaderboard(scores: Record<string, Score>) {
  return Object.entries(scores)
    .map(([pid, s]) => ({ pid, ...s }))
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.ms - b.ms || a.name.localeCompare(b.name, 'th'));
}

export function makeBallot(activity: FeedbackActivity | null, b: Record<string, unknown>): Ballot {
  if (!activity || activity.kind !== 'feedback') bad('ตอนนี้ไม่มีรอบให้ Feedback');
  if (activity!.id !== b.activityId) bad('รอบเปลี่ยนแล้ว กรุณารีเฟรช');
  if (activity!.phase === 'roleplay') bad('ยังไม่เปิดรับ Feedback รอให้จบ Role Play ก่อน');
  if (activity!.phase === 'results') bad('ปิดรับ Feedback แล้ว');
  const scores = b.scores;
  if (!Array.isArray(scores) || scores.length !== 5 || !scores.every(s => Number.isInteger(s) && s >= 1 && s <= 5)) {
    bad('กรุณาให้คะแนน 1–5 ครบทั้ง 5 ข้อ', 400);
  }
  const pick = (v: unknown, allowed: string[]) => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.includes(x)))].slice(0, 4) : [];
  return {
    scores: scores as number[], strengths: pick(b.strengths, strengthTags), improves: pick(b.improves, improveTags),
    good: text(b.good, 240), tip: text(b.tip, 240),
  };
}

export function summarizeFeedback(ballots: Ballot[]): FeedbackSummary {
  const count = ballots.length;
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 10) / 10 : null;
  const criteria = [0, 1, 2, 3, 4].map(i => avg(ballots.map(b => b.scores[i])));
  const tally = (key: 'strengths' | 'improves') => {
    const m = new Map<string, number>();
    for (const b of ballots) for (const t of b[key]) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].map(([tag, c]) => ({ tag, count: c })).sort((a, b) => b.count - a.count).slice(0, 6);
  };
  return {
    count, criteria, overall: avg(ballots.flatMap(b => b.scores)),
    strengths: tally('strengths'), improves: tally('improves'),
    notes: ballots.filter(b => b.good || b.tip).map(b => ({ good: b.good, tip: b.tip })).slice(0, 60),
  };
}

// Admin actions that don't need extra data. Reveal / close are finished in the API route with stored answers.
export function controlClass(state: ClassState, b: Record<string, unknown>, now = Date.now()): ClassState {
  const s = structuredClone(state);
  const a = s.activity;
  if (b.action !== 'new-class' && b.activityId !== undefined && b.activityId !== (a?.id ?? null)) bad('หน้าจอไม่เป็นปัจจุบัน กรุณาลองอีกครั้ง');
  s.expiresAt = Math.max(s.expiresAt, now + classLifetime / 2);
  switch (b.action) {
    case 'new-class':
      return newClass(now);
    case 'quiz-setup': {
      const count = Math.min(Math.max(Math.round(Number(b.count) || 10), 3), quizBank.length);
      const timeLimit = [10, 15, 20, 30].includes(Number(b.timeLimit)) ? Number(b.timeLimit) : 20;
      s.activity = {
        kind: 'quiz', id: randomUUID().slice(0, 8), phase: 'lobby', timeLimit, index: -1,
        order: shuffle(quizBank.map(q => q.id)).slice(0, count), openedAt: null, closesAt: null, scores: {}, reveal: null,
      };
      return s;
    }
    case 'quiz-open': {
      if (a?.kind !== 'quiz' || !(a.phase === 'lobby' || a.phase === 'reveal')) return bad('เปิดคำถามถัดไปไม่ได้ในตอนนี้');
      if (a.index + 1 >= a.order.length) return bad('ครบทุกคำถามแล้ว กดดูผลอันดับ');
      Object.assign(a, { phase: 'question', index: a.index + 1, openedAt: now, closesAt: now + a.timeLimit * 1000, reveal: null });
      return s;
    }
    case 'quiz-final':
      if (a?.kind !== 'quiz' || a.phase !== 'reveal') return bad('ต้องเฉลยข้อล่าสุดก่อน');
      a.phase = 'final';
      return s;
    case 'feedback-start': {
      const advisor = text(b.advisor, 40), customer = text(b.customer, 40);
      if (!advisor) return bad('กรุณาใส่ชื่อผู้รับบทตัวแทน', 400);
      const scenario = Number(b.scenario);
      s.activity = {
        kind: 'feedback', id: randomUUID().slice(0, 8), phase: 'roleplay', advisor, customer,
        scenario: Number.isInteger(scenario) && scenario >= 0 && scenario < personas.length ? scenario : null,
        startedAt: now, endedAt: null, summary: null,
      };
      return s;
    }
    case 'feedback-end':
      if (a?.kind !== 'feedback' || a.phase !== 'roleplay') return bad('ไม่มี Role Play ที่กำลังเล่นอยู่');
      Object.assign(a, { phase: 'voting', endedAt: now });
      return s;
    case 'feedback-reopen':
      if (a?.kind !== 'feedback' || a.phase !== 'results') return bad('ยังไม่ได้ปิดรับ Feedback');
      Object.assign(a, { phase: 'voting', summary: null });
      return s;
    case 'clear':
      s.activity = null;
      return s;
  }
  return bad('ไม่รู้จักคำสั่งนี้', 400);
}

// What every screen is allowed to see. The answer is hidden while a question is open.
export function publicState(state: ClassState, people: number, now = Date.now(), answered = 0, ballots = 0) {
  const a = state.activity;
  const base = { id: state.id, now, people };
  if (!a) return { ...base, activity: null };
  if (a.kind === 'feedback') {
    const p = a.scenario === null ? null : personas[a.scenario];
    return { ...base, activity: { ...a, scenarioTitle: p?.title ?? null, ballots } };
  }
  const item = a.index >= 0 ? quizBank.find(q => q.id === a.order[a.index]) : undefined;
  const board = leaderboard(a.scores);
  return {
    ...base,
    activity: {
      kind: a.kind, id: a.id, phase: a.phase, timeLimit: a.timeLimit, index: a.index, total: a.order.length,
      openedAt: a.openedAt, closesAt: a.closesAt, answered, reveal: a.reveal,
      question: item ? { context: item.context, line: item.line } : null,
      board: board.slice(0, 10).map(({ pid, name, score, correct, last, streak }) => ({ pid, name, score, correct, last, streak })),
      players: board.length,
      scores: Object.fromEntries(board.map((x, i) => [x.pid, { rank: i + 1, score: x.score, correct: x.correct, last: x.last }])),
    },
  };
}
export type PublicClass = ReturnType<typeof publicState>;
