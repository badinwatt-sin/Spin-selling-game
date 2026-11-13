import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { GameError } from './game';
import { newClass, type Answer, type Ballot, type ClassState, choices } from './classroom';
import { ConflictError, root, store } from './store';
import type { StageKey } from '../spin';

const statePath = `${root}class/state.json`;
const base = (sid: string) => `${root}class/${sid}/`;
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

export function secret() {
  const key = process.env.LIVE_ADMIN_KEY;
  if (key) return key;
  if (process.env.NODE_ENV !== 'production') return 'admin';
  return null;
}
const sign = (value: string) => createHmac('sha256', (secret() ?? 'spin-class') + ':player').update(value).digest('base64url').slice(0, 22);
const equal = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function readState(now = Date.now()): Promise<{ state: ClassState; etag: string }> {
  for (let i = 0; i < 3; i++) {
    const found = await store.read<ClassState>(statePath);
    if (found && found.data.expiresAt > now) return { state: found.data, etag: found.etag };
    const fresh = newClass(now);
    try {
      await store.write(statePath, fresh, found ? { etag: found.etag } : { create: true });
    } catch (e) { if (!(e instanceof ConflictError)) throw e; }
  }
  throw new GameError('เชื่อมต่อห้องเรียนไม่สำเร็จ กรุณาลองอีกครั้ง', 503);
}

export async function writeState(state: ClassState, etag: string) {
  try { await store.write(statePath, state, { etag }); }
  catch (e) {
    if (e instanceof ConflictError) throw new GameError('สถานะเพิ่งเปลี่ยน กรุณากดอีกครั้ง', 409);
    throw e;
  }
}

// Short cache so a full classroom polling every two seconds doesn't hammer storage.
const g = globalThis as unknown as { __classCache?: Map<string, { at: number; value: unknown }> };
const cache = g.__classCache ??= new Map();
export async function cached<T>(key: string, ms: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 200) cache.clear();
  return value;
}
export const forget = () => cache.clear();

// Players
export function playerToken(sid: string, name: string) {
  const pid = randomUUID().replace(/-/g, '').slice(0, 16);
  const body = `${sid}.${pid}.${b64(name)}`;
  return { pid, token: `${body}.${sign(body)}` };
}
export function readPlayer(token: string, sid: string) {
  const parts = token.split('.');
  if (parts.length !== 4) throw new GameError('กรุณาใส่ชื่อเพื่อเข้าร่วมใหม่', 401);
  const body = parts.slice(0, 3).join('.');
  if (!equal(parts[3], sign(body))) throw new GameError('กรุณาใส่ชื่อเพื่อเข้าร่วมใหม่', 401);
  if (parts[0] !== sid) throw new GameError('ผู้สอนเริ่มคลาสใหม่แล้ว กรุณาใส่ชื่อเข้าร่วมอีกครั้ง', 401);
  return { pid: parts[1], name: unb64(parts[2]), nameKey: parts[2] };
}
export async function registerPlayer(sid: string, pid: string, name: string) {
  await store.write(`${base(sid)}p/${pid}.${b64(name)}`, { at: Date.now() }, { overwrite: true });
}
export async function listPlayers(sid: string) {
  const prefix = `${base(sid)}p/`;
  return (await store.list(prefix)).sort((a, b) => a.uploadedAt - b.uploadedAt)
    .map(e => unb64(e.pathname.slice(prefix.length).split('.')[1] ?? '') || 'ผู้เล่น');
}

// Quiz answers: everything needed for scoring lives in the pathname, so one list() call scores a question.
export async function saveAnswer(sid: string, aid: string, index: number, pid: string, nameKey: string, choice: StageKey, ms: number) {
  try {
    await store.write(`${base(sid)}q/${aid}/${index}/${pid}.${choice}.${ms}.${nameKey}`, { at: Date.now() }, { create: true });
  } catch (e) { if (!(e instanceof ConflictError)) throw e; }
}
export async function listAnswers(sid: string, aid: string, index: number): Promise<Answer[]> {
  const prefix = `${base(sid)}q/${aid}/${index}/`;
  return (await store.list(prefix)).flatMap(e => {
    const [pid, choice, ms, nameKey] = e.pathname.slice(prefix.length).split('.');
    if (!pid || !choices.includes(choice as StageKey) || !/^\d+$/.test(ms ?? '')) return [];
    return [{ pid, choice: choice as StageKey, ms: Number(ms), name: unb64(nameKey ?? '') || 'ผู้เล่น' }];
  });
}

// Peer feedback ballots: one file per person, editable until the admin closes voting.
export async function saveBallot(sid: string, aid: string, pid: string, ballot: Ballot) {
  await store.write(`${base(sid)}f/${aid}/${pid}.json`, ballot, { overwrite: true });
}
export async function countBallots(sid: string, aid: string) {
  return (await store.list(`${base(sid)}f/${aid}/`)).length;
}
export async function readBallots(sid: string, aid: string) {
  const entries = await store.list(`${base(sid)}f/${aid}/`);
  const out: Ballot[] = [];
  for (let i = 0; i < entries.length; i += 20) {
    const batch = await Promise.all(entries.slice(i, i + 20).map(e => store.read<Ballot>(e.pathname)));
    for (const b of batch) if (b) out.push(b.data);
  }
  return out;
}

// Post-it notes: one per person per activity, editable until the trainer reveals the wall.
export async function saveNote(sid: string, aid: string, pid: string, name: string, text: string) {
  const path = `${base(sid)}n/${aid}/${pid}.json`;
  const prev = await store.read<{ at: number }>(path);
  // Keep the first-submitted time so an edited note stays in its place on the wall.
  await store.write(path, { name, text, at: prev?.data.at ?? Date.now(), edited: Date.now() }, { overwrite: true });
}
export async function countNotes(sid: string, aid: string) {
  return (await store.list(`${base(sid)}n/${aid}/`)).length;
}
export async function readNotes(sid: string, aid: string) {
  const prefix = `${base(sid)}n/${aid}/`;
  const entries = await store.list(prefix);
  const out: { pid: string; name: string; text: string; at: number }[] = [];
  for (let i = 0; i < entries.length; i += 20) {
    const slice = entries.slice(i, i + 20);
    const batch = await Promise.all(slice.map(e => store.read<{ name: string; text: string; at: number }>(e.pathname)));
    batch.forEach((b, j) => { if (b) out.push({ pid: slice[j].pathname.slice(prefix.length).replace(/\.json$/, ''), ...b.data }); });
  }
  return out.sort((a, b) => a.at - b.at || a.pid.localeCompare(b.pid));
}
