// Whole-class activities: pure state logic (no I/O).
//  1) SPIN quiz — "Is this line S, P, I or N?" Fast + correct answers score more; top 3 podium.
//  2) Peer feedback — the class scores the Advisor of one pair who role-plays in front of the room.
import { randomUUID } from 'node:crypto';
import { GameError } from './game.ts';
import { quizBank } from './quiz-bank.ts';
import { personas } from './personas.ts';
import { improveTags, showtimeCriteria, strengthTags, type StageKey } from '../spin.ts';

export const choices: StageKey[] = ['S', 'P', 'I', 'N'];
export const classLifetime = 10 * 3600_000;
// Like a game show: the question is shown first, answers unlock after a short read.
export const readLead = 3500;

export type Score = { name: string; score: number; correct: number; ms: number; last: number; streak: number };
export type Reveal = {
  index: number; answer: StageKey; why: string; answered: number;
  counts: Record<StageKey, number>; fastest: { name: string; ms: number }[];
};
export type QuizActivity = {
  kind: 'quiz'; id: string; phase: 'lobby' | 'question' | 'reveal' | 'final';
  order: number[]; timeLimit: number; maxPoints?: number; speedBonus?: boolean; index: number; shownAt?: number | null; openedAt: number | null; closesAt: number | null;
  scores: Record<string, Score>; reveal: Reveal | null;
};
export type FeedbackSummary = {
  count: number; overall: number | null; criteria: (number | null)[];
  strengths: { tag: string; count: number }[]; improves: { tag: string; count: number }[];
  notes: { good: string; tip: string }[];
};
export type FeedbackActivity = {
  kind: 'feedback'; id: string; phase: 'roleplay' | 'voting' | 'results';
  advisor: string; customer: string; scenario: number | null; duration: number;
  startedAt: number; endedAt: number | null; summary: FeedbackSummary | null;
};
// Post-it activity from the deck: everyone writes one question for a stage, then the wall is revealed.
export type Note = { pid?: string; text: string; name: string; star: boolean };
export type LiveNote = { pid: string; name: string; text: string; at: number };
export type PostitActivity = {
  kind: 'postit'; id: string; phase: 'writing' | 'wall'; stage: StageKey; scenario: number | null;
  startedAt: number; endsAt: number; notes: Note[];
  stars?: string[]; focus?: string | null; // note ids (pid) starred / spotlighted by the trainer
};
export type RecapActivity = { kind: 'recap'; id: string };
export type ShowtimeResult = { id: string; advisor: string; customer: string; scenario: number | null; overall: number | null; criteria: (number | null)[]; count: number };
export type ClassState = {
  id: string; startedAt: number; expiresAt: number;
  activity: QuizActivity | FeedbackActivity | PostitActivity | RecapActivity | null;
  showtime?: ShowtimeResult[];
};

export type Answer = { pid: string; name: string; choice: StageKey; ms: number };
export type Ballot = { scores: number[]; strengths: string[]; improves: string[]; good: string; tip: string };
export const ballotCriteria = showtimeCriteria.length;

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

export const pointOptions = [100, 500, 1000, 2000];

// Correct answers earn between half and the full maximum, depending on speed (or always the maximum without speed bonus).
export function points(correct: boolean, ms: number, limitMs: number, max = 1000, speedBonus = true) {
  if (!correct) return 0;
  if (!speedBonus) return max;
  const t = Math.min(Math.max(ms, 0), limitMs);
  return Math.round(max - (max / 2) * (t / limitMs));
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
    s.last = points(ok, a.ms, limitMs, quiz.maxPoints ?? 1000, quiz.speedBonus ?? true);
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
  if (!Array.isArray(scores) || scores.length !== ballotCriteria || !scores.every(s => Number.isInteger(s) && s >= 1 && s <= 5)) {
    bad(`กรุณาให้คะแนน 1–5 ครบทั้ง ${ballotCriteria} ข้อ`, 400);
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
  const criteria = Array.from({ length: ballotCriteria }, (_, i) => avg(ballots.map(b => b.scores[i]).filter(x => typeof x === 'number')));
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

// Closing a Show Time pair records its result so the trainer can compare all pairs at the end.
export function closeFeedback(state: ClassState, summary: FeedbackSummary): ClassState {
  const a = state.activity;
  if (a?.kind !== 'feedback') return bad('ไม่มีรอบ Feedback');
  const entry: ShowtimeResult = { id: a.id, advisor: a.advisor, customer: a.customer, scenario: a.scenario, overall: summary.overall, criteria: summary.criteria, count: summary.count };
  return {
    ...state, activity: { ...a, phase: 'results', summary },
    showtime: [...(state.showtime ?? []).filter(x => x.id !== a.id), entry].slice(-12),
  };
}

export function makeNote(activity: PostitActivity | null, b: Record<string, unknown>, now = Date.now()) {
  if (!activity || activity.kind !== 'postit') bad('ตอนนี้ไม่มีกิจกรรม Post-it');
  if (activity!.id !== b.activityId) bad('กิจกรรมเปลี่ยนแล้ว กรุณารีเฟรช');
  if (activity!.phase !== 'writing' || now > activity!.endsAt + 5000) bad('หมดเวลาเขียน Post-it แล้ว');
  const t = text(b.text, 200);
  if (t.length < 5) bad('เขียนคำถามอย่างน้อย 5 ตัวอักษร', 400);
  return t;
}

// Admin actions that don't need extra data. Reveal / close are finished in the API route with stored answers.
export function controlClass(state: ClassState, b: Record<string, unknown>, now = Date.now()): ClassState {
  const s = structuredClone(state);
  const a = s.activity;
  if (b.action !== 'new-class' && b.activityId !== undefined && b.activityId !== (a?.id ?? null)) bad('หน้าจอไม่เป็นปัจจุบัน กรุณาลองอีกครั้ง');
  s.expiresAt = Math.max(s.expiresAt, now + classLifetime / 2);
  const id = () => randomUUID().slice(0, 8);
  const scenarioOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n < personas.length ? n : null; };
  switch (b.action) {
    case 'new-class':
      return newClass(now);
    case 'quiz-setup': {
      const count = Math.min(Math.max(Math.round(Number(b.count) || 10), 3), 20, quizBank.length);
      const timeLimit = [10, 15, 20, 30].includes(Number(b.timeLimit)) ? Number(b.timeLimit) : 20;
      const maxPoints = pointOptions.includes(Number(b.maxPoints)) ? Number(b.maxPoints) : 1000;
      const speedBonus = b.speedBonus !== false;
      // Keep the S/P/I/N mix balanced whatever the count.
      const byStage = choices.map(k => shuffle(quizBank.filter(q => q.answer === k).map(q => q.id)));
      const order: number[] = [];
      for (let i = 0; order.length < count; i++) { const pool = byStage[i % 4]; const next = pool.shift(); if (next !== undefined) order.push(next); }
      s.activity = { kind: 'quiz', id: id(), phase: 'lobby', timeLimit, maxPoints, speedBonus, index: -1, order: shuffle(order), openedAt: null, closesAt: null, scores: {}, reveal: null };
      return s;
    }
    case 'quiz-open': {
      if (a?.kind !== 'quiz' || !(a.phase === 'lobby' || a.phase === 'reveal')) return bad('เปิดคำถามถัดไปไม่ได้ในตอนนี้');
      if (a.index + 1 >= a.order.length) return bad('ครบทุกคำถามแล้ว กดดูผลอันดับ');
      Object.assign(a, { phase: 'question', index: a.index + 1, shownAt: now, openedAt: now + readLead, closesAt: now + readLead + a.timeLimit * 1000, reveal: null });
      return s;
    }
    case 'quiz-final':
      if (a?.kind !== 'quiz' || a.phase !== 'reveal') return bad('ต้องเฉลยข้อล่าสุดก่อน');
      a.phase = 'final';
      return s;
    case 'feedback-start': {
      const advisor = text(b.advisor, 40), customer = text(b.customer, 40);
      if (!advisor) return bad('กรุณาใส่ชื่อผู้รับบทตัวแทน', 400);
      const minutes = [5, 8, 10, 12, 15].includes(Number(b.minutes)) ? Number(b.minutes) : 10;
      s.activity = { kind: 'feedback', id: id(), phase: 'roleplay', advisor, customer, scenario: scenarioOf(b.scenario), duration: minutes * 60, startedAt: now, endedAt: null, summary: null };
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
    case 'postit-start': {
      const stage = choices.includes(b.stage as StageKey) ? b.stage as StageKey : 'S';
      const minutes = [2, 3, 5].includes(Number(b.minutes)) ? Number(b.minutes) : 3;
      s.activity = { kind: 'postit', id: id(), phase: 'writing', stage, scenario: scenarioOf(b.scenario), startedAt: now, endsAt: now + minutes * 60_000, notes: [] };
      return s;
    }
    case 'postit-star': {
      if (a?.kind !== 'postit') return bad('ไม่มีกิจกรรม Post-it');
      const pid = typeof b.pid === 'string' ? b.pid : '';
      if (!pid) return bad('ไม่พบ Post-it นี้', 400);
      const stars = new Set(a.stars ?? []);
      if (stars.has(pid)) stars.delete(pid); else stars.add(pid);
      a.stars = [...stars];
      a.notes = a.notes.map(n => n.pid === pid ? { ...n, star: stars.has(pid) } : n);
      return s;
    }
    case 'postit-focus': {
      if (a?.kind !== 'postit') return bad('ไม่มีกิจกรรม Post-it');
      a.focus = typeof b.pid === 'string' && b.pid ? b.pid : null;
      return s;
    }
    case 'recap':
      if (!s.showtime?.length) return bad('ยังไม่มีผล Show Time ให้สรุป');
      s.activity = { kind: 'recap', id: id() };
      return s;
    case 'clear':
      s.activity = null;
      return s;
  }
  return bad('ไม่รู้จักคำสั่งนี้', 400);
}

// What every screen is allowed to see. The quiz answer is hidden while a question is open,
// and Post-it notes stay hidden until the trainer reveals the wall.
export function publicState(state: ClassState, people: number, now = Date.now(), answered = 0, ballots = 0, liveNotes: LiveNote[] | null = null) {
  const a = state.activity;
  const showtime = [...(state.showtime ?? [])].sort((x, y) => (y.overall ?? 0) - (x.overall ?? 0))
    .map(x => ({ ...x, scenarioTitle: x.scenario === null ? null : personas[x.scenario].title }));
  const base = { id: state.id, now, people, showtime };
  if (!a) return { ...base, activity: null };
  if (a.kind === 'recap') return { ...base, activity: a };
  if (a.kind === 'feedback') {
    const p = a.scenario === null ? null : personas[a.scenario];
    return { ...base, activity: { ...a, scenarioTitle: p?.title ?? null, ballots } };
  }
  if (a.kind === 'postit') {
    const p = a.scenario === null ? null : personas[a.scenario];
    // Screens (trainer + projector) get notes live while people write; phones get none.
    const stars = new Set(a.stars ?? []);
    const notes = a.phase === 'wall' ? a.notes.map(n => ({ ...n, star: n.star || (n.pid ? stars.has(n.pid) : false) }))
      : (liveNotes ?? []).map(n => ({ pid: n.pid, name: n.name, text: n.text, star: stars.has(n.pid) }));
    const written = a.phase === 'wall' ? a.notes.length : liveNotes ? liveNotes.length : answered;
    return { ...base, activity: { ...a, notes, written, focus: a.focus ?? null, scenarioTitle: p?.title ?? null, scenarioBrief: p?.brief ?? null } };
  }
  const item = a.index >= 0 ? quizBank.find(q => q.id === a.order[a.index]) : undefined;
  const board = leaderboard(a.scores);
  return {
    ...base,
    activity: {
      kind: a.kind, id: a.id, phase: a.phase, timeLimit: a.timeLimit, maxPoints: a.maxPoints ?? 1000, speedBonus: a.speedBonus ?? true, index: a.index, total: a.order.length,
      shownAt: a.shownAt ?? a.openedAt, openedAt: a.openedAt, closesAt: a.closesAt, answered, reveal: a.reveal,
      question: item ? { context: item.context, line: item.line } : null,
      board: board.slice(0, 10).map(({ pid, name, score, correct, last, streak }) => ({ pid, name, score, correct, last, streak })),
      players: board.length,
      scores: Object.fromEntries(board.map((x, i) => [x.pid, { rank: i + 1, score: x.score, correct: x.correct, last: x.last, streak: x.streak, name: x.name }])),
    },
  };
}
export type PublicClass = ReturnType<typeof publicState>;
