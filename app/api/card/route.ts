import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readRoom } from '@/lib/server/storage';
import { member, fail, GameError } from '@/lib/server/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The scenario card image is for the Customer only.
export async function GET(req: Request) {
  try {
    const { room } = await readRoom(new URL(req.url).searchParams.get('code') || '');
    const me = member(room, req.headers.get('authorization')?.replace(/^Bearer /, '') || '');
    if (me === room.advisor) fail('ภาพการ์ดนี้สำหรับผู้รับบทลูกค้าเท่านั้น', 403);
    const image = await readFile(join(process.cwd(), 'private', 'cards', `${room.scenario}.jpeg`));
    return new Response(image, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (e) {
    return Response.json({ error: e instanceof GameError ? e.message : 'ไม่สามารถโหลดการ์ดได้' },
      { status: e instanceof GameError ? e.status : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
