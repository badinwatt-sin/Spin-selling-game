import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GameError } from '@/lib/server/game';
import { choices, closeFeedback, controlClass, makeBallot, makeNote, notebook, publicState, revealPostit, scoreQuestion, summarizeFeedback } from '@/lib/server/classroom';
import {
  cached, countBallots, listPlayers, forget, listAnswers, peekState, playerToken, readBallots, readNotes, readPlayer, readState,
  registerPlayer, saveAnswer, saveBallot, saveNote, secret, writeState,
} from '@/lib/server/class-storage';
import type { StageKey } from '@/lib/spin';
import { parseRoom, rooms } from '@/lib/rooms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cookie = 'spin_class_admin';
const adminHours = 10;
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const bearer = (req: Request) => req.headers.get('authorization')?.replace(/^Bearer /, '') || '';

const equal = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const signAdmin = (expiry: string, key: string) => createHmac('sha256', key).update(`spin-class-admin:${expiry}`).digest('base64url');
function isAdmin(req: NextRequest) {
  const key = secret();
  const [expiry, sig] = (req.cookies.get(cookie)?.value ?? '').split('.');
  return Boolean(key && sig && /^\d+$/.test(expiry) && Number(expiry) > Date.now() && equal(sig, signAdmin(expiry, key)));
}

function handle(e: unknown) {
  if (e instanceof GameError) return reply({ error: e.message }, e.status);
  console.error('Class request failed', e instanceof Error ? e.message : 'Unknown error');
  return reply({ error: 'เชื่อมต่อห้องเรียนไม่สำเร็จ กรุณาลองอีกครั้ง' }, 503);
}

async function snapshot(room: number, screen: boolean, fresh = false) {
  const now = Date.now();
  const { state } = fresh ? await readState(room, now) : await cached(`state:${room}`, 800, () => readState(room, now));
  const a = state.activity;
  let people = 0, answered = 0, ballots = 0, names: string[] = [];
  let liveNotes: Awaited<ReturnType<typeof readNotes>> | null = null;
  if (screen) {
    names = await cached(`p:${state.id}`, fresh ? 0 : 1500, () => listPlayers(state.id));
    people = names.length;
    if (a?.kind === 'quiz' && a.phase === 'question') answered = (await listAnswers(state.id, a.id, a.index)).length;
    if (a?.kind === 'feedback' && a.phase !== 'roleplay') ballots = await countBallots(state.id, a.id);
    if (a?.kind === 'postit' && a.phase === 'writing') liveNotes = await cached(`n:${a.id}`, fresh ? 0 : 1500, () => readNotes(state.id, a.id));
  }
  return { ...publicState(state, people, now, answered, ballots, liveNotes), room, names: names.slice(-80) };
}

// Room picker / home banner: which rooms have a class going, without creating any room.
async function roomList() {
  const now = Date.now();
  return Promise.all(rooms.map(room => cached(`peek:${room}`, 4000, async () => {
    const state = await peekState(room, now);
    const people = state ? (await listPlayers(state.id)).length : 0;
    return { room, label: state?.label ?? null, activity: state?.activity?.kind ?? null, people };
  })));
}

export async function GET(req: NextRequest) {
  try {
    const as = req.nextUrl.searchParams.get('as');
    const room = parseRoom(req.nextUrl.searchParams.get('room'));
    if (as === 'rooms') return reply({ rooms: await roomList() });
    if (as === 'board') {
      const { state } = await cached(`state:${room}`, 800, () => readState(room));
      return reply(notebook(state, room));
    }
    const admin = as === 'admin' && isAdmin(req);
    const data = await snapshot(room, as === 'display' || admin);
    return reply({ ...data, admin, adminReady: Boolean(secret()) });
  } catch (e) { return handle(e); }
}

export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get('content-length')) > 6000) return reply({ error: 'ข้อมูลมีขนาดใหญ่เกินไป' }, 413);
    const b = await req.json() as Record<string, unknown>;
    const now = Date.now();
    const room = parseRoom(req.nextUrl.searchParams.get('room'));
    const load = (ms: number) => cached(`state:${room}`, ms, () => readState(room, now));

    if (b.action === 'login') {
      const key = secret();
      if (!key) return reply({ error: 'ยังไม่ได้ตั้งค่า LIVE_ADMIN_KEY ใน Vercel' }, 503);
      if (typeof b.key !== 'string' || !equal(b.key, key)) return reply({ error: 'รหัสผู้สอนไม่ถูกต้อง' }, 401);
      const expiry = String(now + adminHours * 3600_000);
      const res = reply({ ok: true });
      res.cookies.set(cookie, `${expiry}.${signAdmin(expiry, key)}`, {
        httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: adminHours * 3600,
      });
      return res;
    }
    if (b.action === 'logout') {
      const res = reply({ ok: true });
      res.cookies.delete(cookie);
      return res;
    }

    if (b.action === 'join') {
      const name = typeof b.name === 'string' ? b.name.replace(/\s+/g, ' ').trim().slice(0, 24) : '';
      if (!name) return reply({ error: 'กรุณาใส่ชื่อเล่น' }, 400);
      const { state } = await load(800);
      const { pid, token } = playerToken(state.id, name);
      await registerPlayer(state.id, pid, name);
      return reply({ token, pid, name, classId: state.id });
    }

    if (b.action === 'answer') {
      const { state } = await load(500);
      const me = readPlayer(bearer(req), state.id);
      const a = state.activity;
      if (a?.kind !== 'quiz' || a.id !== b.activityId || a.phase !== 'question' || a.index !== b.index) {
        return reply({ error: 'คำถามนี้ปิดไปแล้ว' }, 409);
      }
      if (!choices.includes(b.choice as StageKey)) return reply({ error: 'กรุณาเลือก S, P, I หรือ N' }, 400);
      if (now < (a.openedAt ?? 0) - 300) return reply({ error: 'รอให้ตัวเลือกขึ้นก่อนนะ' }, 409);
      const ms = Math.max(0, now - (a.openedAt ?? now));
      if (now > (a.closesAt ?? 0) + 1500) return reply({ error: 'หมดเวลาตอบข้อนี้แล้ว' }, 409);
      await saveAnswer(state.id, a.id, a.index, me.pid, me.nameKey, b.choice as StageKey, ms);
      return reply({ ok: true, ms });
    }

    if (b.action === 'ballot') {
      const { state } = await readState(room, now);
      const me = readPlayer(bearer(req), state.id);
      const a = state.activity;
      const ballot = makeBallot(a?.kind === 'feedback' ? a : null, b);
      await saveBallot(state.id, a!.id, me.pid, ballot);
      return reply({ ok: true });
    }

    if (b.action === 'note') {
      const { state } = await load(500);
      const me = readPlayer(bearer(req), state.id);
      const a = state.activity;
      const text = makeNote(a?.kind === 'postit' ? a : null, b, now);
      await saveNote(state.id, a!.id, me.pid, me.name, text);
      return reply({ ok: true });
    }

    // Everything below is for the trainer.
    if (!isAdmin(req)) return reply({ error: 'กรุณาเข้าสู่ระบบผู้สอน' }, 401);
    const { state, etag } = await readState(room, now);
    let next = state;
    const a = state.activity;
    if (b.action === 'quiz-reveal') {
      if (a?.kind !== 'quiz' || a.phase !== 'question' || b.activityId !== a.id) return reply({ error: 'ไม่มีคำถามที่เปิดอยู่' }, 409);
      next = { ...state, activity: scoreQuestion(a, await listAnswers(state.id, a.id, a.index)) };
    } else if (b.action === 'feedback-close') {
      if (a?.kind !== 'feedback' || a.phase !== 'voting' || b.activityId !== a.id) return reply({ error: 'ไม่มีรอบที่เปิดรับ Feedback' }, 409);
      next = closeFeedback(state, summarizeFeedback(await readBallots(state.id, a.id)));
    } else if (b.action === 'postit-reveal') {
      if (a?.kind !== 'postit' || a.phase !== 'writing' || b.activityId !== a.id) return reply({ error: 'ไม่มีกิจกรรม Post-it ที่เปิดอยู่' }, 409);
      next = revealPostit(state, await readNotes(state.id, a.id), now);
    } else {
      next = controlClass(state, b, now);
    }
    await writeState(room, next, etag);
    forget();
    return reply({ ...(await snapshot(room, true, true)), admin: true, adminReady: true });
  } catch (e) { return handle(e); }
}
