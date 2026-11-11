// Pair role play: pure room logic (no I/O), so it can be unit-tested with node --test.
import { randomInt, randomUUID } from 'node:crypto';
import { personas } from './personas.ts';
import { reactionByKey, type ReactionKey } from '../spin.ts';

export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export const fail = (message: string, status = 400): never => { throw new GameError(message, status); };

export type Reaction = { k: ReactionKey; at: number; stage: number };
export type Report = {
  round: number; advisorId: number; advisor: string; customer: string; scenario: string;
  scores: number[]; comment: string; reactions: Partial<Record<ReactionKey, number>>;
  stageReached: number; seconds: number; createdAt: number;
};
export type Phase = 'lobby' | 'play' | 'feedback' | 'report';
export type Room = {
  code: string; players: { name: string; token: string }[]; advisor: number; scenario: number;
  round: number; phase: Phase; stage: number; maxStage: number; ready: boolean;
  startedAt: number | null; ends: number | null; duration: number;
  reactions: Reaction[]; reports: Report[]; expires: number; revision: number;
};

export const roomLifetime = 4 * 3600_000;
const durations = [300, 600, 900, 1200];
const clean = (v: unknown, n = 2000) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';
export const newToken = () => randomUUID() + randomUUID();
const otherScenario = (current: number) => (current + 1 + randomInt(personas.length - 1)) % personas.length;

export function createRoom(b: Record<string, unknown>, now = Date.now()): Room {
  const name = clean(b.name, 30);
  if (!name) fail('กรุณาใส่ชื่อเล่น');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join('');
  const selected = Number(b.scenario);
  const duration = durations.includes(Number(b.duration)) ? Number(b.duration) : 600;
  return {
    code, players: [{ name, token: newToken() }], advisor: b.role === 'customer' ? 1 : 0,
    scenario: Number.isInteger(selected) && selected >= 0 && selected < personas.length ? selected : randomInt(personas.length),
    round: 1, phase: 'lobby', stage: 0, maxStage: 0, ready: false, startedAt: null, ends: null, duration,
    reactions: [], reports: [], expires: now + roomLifetime, revision: 0,
  };
}

export function member(r: Room, token: string, now = Date.now()) {
  if (r.expires <= now) fail('ห้องหมดอายุแล้ว กรุณาสร้างห้องใหม่', 410);
  const index = token ? r.players.findIndex(p => p.token === token) : -1;
  if (index < 0) fail('ไม่พบผู้เล่นในห้องนี้ กรุณาเข้าห้องใหม่', 401);
  return index;
}

export function transition(room: Room, b: Record<string, unknown>, token: string, now = Date.now()): { room: Room; token?: string } {
  const r: Room = structuredClone(room);
  const done = (extra: { token?: string } = {}) => { r.revision++; return { room: r, ...extra }; };

  if (b.action === 'join') {
    const name = clean(b.name, 30);
    if (!name) fail('กรุณาใส่ชื่อเล่น');
    const already = token ? r.players.findIndex(p => p.token === token) : -1;
    if (already >= 0) return { room, token };
    if (r.players.length >= 2) fail('ห้องนี้มีผู้เล่นครบ 2 คนแล้ว', 409);
    if (r.players[0].name === name) fail('ชื่อนี้ถูกใช้แล้วในห้อง ลองเติมตัวอักษรเพิ่ม', 409);
    const t = newToken();
    r.players.push({ name, token: t });
    return done({ token: t });
  }

  const me = member(r, token, now);
  const isAdvisor = me === r.advisor;
  const need = (ok: boolean, message: string, status = 409) => { if (!ok) fail(message, status); };

  switch (b.action) {
    case 'shuffle':
      need(r.phase === 'lobby', 'เปลี่ยนการ์ดได้ก่อนเริ่มเท่านั้น');
      r.scenario = otherScenario(r.scenario); r.ready = false;
      return done();
    case 'ready':
      need(r.phase === 'lobby', 'รอบนี้เริ่มไปแล้ว');
      need(!isAdvisor, 'ผู้รับบทลูกค้าเป็นคนกดพร้อม', 403);
      r.ready = b.ready !== false;
      return done();
    case 'start':
      need(r.phase === 'lobby', 'รอบนี้เริ่มไปแล้ว');
      need(isAdvisor, 'ตัวแทนเป็นคนกดเริ่ม', 403);
      need(r.players.length === 2, 'รอเพื่อนเข้าห้องก่อน');
      need(r.ready, 'รอลูกค้าอ่านการ์ดและกดพร้อมก่อน');
      Object.assign(r, { phase: 'play', stage: 0, maxStage: 0, startedAt: now, ends: now + r.duration * 1000, reactions: [] });
      return done();
    case 'stage': {
      need(r.phase === 'play', 'ยังไม่ได้เริ่มสนทนา');
      need(isAdvisor, 'ตัวแทนเป็นคนเลื่อนขั้น SPIN', 403);
      const stage = Number(b.stage);
      need(Number.isInteger(stage) && stage >= 0 && stage <= 3, 'ขั้นไม่ถูกต้อง', 400);
      if (stage === r.stage) return { room };
      r.stage = stage; r.maxStage = Math.max(r.maxStage, stage);
      return done();
    }
    case 'react': {
      need(r.phase === 'play', 'ส่งความรู้สึกได้ระหว่างสนทนาเท่านั้น');
      need(!isAdvisor, 'ปุ่มความรู้สึกสำหรับผู้รับบทลูกค้า', 403);
      const k = b.kind as ReactionKey;
      need(typeof k === 'string' && k in reactionByKey, 'ไม่รู้จักความรู้สึกนี้', 400);
      const last = r.reactions.at(-1);
      if (last && now - last.at < 600) return { room };
      r.reactions.push({ k, at: now, stage: r.stage });
      if (r.reactions.length > 200) r.reactions.splice(0, r.reactions.length - 200);
      return done();
    }
    case 'finish':
      need(r.phase === 'play', 'ยังไม่ได้เริ่มสนทนา');
      need(isAdvisor, 'ตัวแทนเป็นคนกดจบบทสนทนา', 403);
      r.phase = 'feedback'; r.ends = now;
      return done();
    case 'feedback': {
      need(r.phase === 'feedback', 'ยังไม่ถึงช่วงให้คะแนน');
      need(!isAdvisor, 'ลูกค้าเป็นคนให้คะแนนตัวแทน', 403);
      const scores = b.scores;
      need(Array.isArray(scores) && scores.length === 5 && scores.every(s => Number.isInteger(s) && s >= 1 && s <= 5),
        'กรุณาให้คะแนน 1–5 ครบทั้ง 5 ข้อ', 400);
      const counts: Partial<Record<ReactionKey, number>> = {};
      for (const x of r.reactions) counts[x.k] = (counts[x.k] ?? 0) + 1;
      r.reports.push({
        round: r.round, advisorId: r.advisor, advisor: r.players[r.advisor].name, customer: r.players[1 - r.advisor].name,
        scenario: personas[r.scenario].title, scores: scores as number[], comment: clean(b.comment, 400), reactions: counts,
        stageReached: r.maxStage, seconds: Math.max(0, Math.round(((r.ends ?? now) - (r.startedAt ?? now)) / 1000)), createdAt: now,
      });
      r.phase = 'report';
      return done();
    }
    case 'next':
      need(r.phase === 'report', 'ยังจบรอบนี้ไม่เสร็จ');
      need(r.round < 20, 'ห้องนี้เล่นครบจำนวนรอบแล้ว กรุณาสร้างห้องใหม่');
      Object.assign(r, {
        round: r.round + 1, advisor: 1 - r.advisor, scenario: otherScenario(r.scenario), phase: 'lobby',
        stage: 0, maxStage: 0, ready: false, startedAt: null, ends: null, reactions: [],
      });
      r.expires = Math.max(r.expires, now + roomLifetime / 2);
      return done();
    case 'duration':
      need(r.phase === 'lobby', 'ตั้งเวลาได้ก่อนเริ่มเท่านั้น');
      need(durations.includes(Number(b.duration)), 'เวลาไม่ถูกต้อง', 400);
      r.duration = Number(b.duration);
      return done();
  }
  return fail('ไม่รู้จักคำสั่งนี้', 400);
}

export function view(r: Room, token: string, now = Date.now()) {
  const me = member(r, token, now);
  const role = me === r.advisor ? 'advisor' : 'customer';
  const p = personas[r.scenario];
  return {
    revision: r.revision, code: r.code, now, me, role,
    players: r.players.map(x => ({ name: x.name })),
    round: r.round, phase: r.phase, stage: r.stage, maxStage: r.maxStage, ready: r.ready,
    startedAt: r.startedAt, ends: r.ends, duration: r.duration,
    scenario: { id: p.id, title: p.title, en: p.en, brief: p.brief },
    ...(role === 'advisor'
      ? { lines: p.lines }
      : { persona: { facts: p.facts, attitude: p.attitude, objection: p.objection, play: p.play } }),
    reactions: r.reactions.slice(-40),
    reports: r.reports.filter(x => x.advisorId === me),
  };
}
export type GameView = ReturnType<typeof view>;
