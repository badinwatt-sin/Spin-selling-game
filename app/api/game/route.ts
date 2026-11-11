import { createRoom, transition, view, GameError } from '@/lib/server/game';
import { readRoom, writeRoom } from '@/lib/server/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const auth = (req: Request) => req.headers.get('authorization')?.replace(/^Bearer /, '') || '';

function error(e: unknown) {
  if (e instanceof GameError) return reply({ error: e.message }, e.status);
  console.error('Game request failed', e instanceof Error ? e.message : 'Unknown error');
  return reply({ error: 'การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง' }, 503);
}

export async function GET(req: Request) {
  try {
    const { room } = await readRoom((new URL(req.url).searchParams.get('code') || '').toUpperCase());
    return reply(view(room, auth(req)));
  } catch (e) { return error(e); }
}

export async function POST(req: Request) {
  try {
    if (Number(req.headers.get('content-length')) > 8000) return reply({ error: 'ข้อมูลมีขนาดใหญ่เกินไป' }, 413);
    const b = await req.json() as Record<string, unknown>;
    if (b.action === 'create') {
      const room = createRoom(b);
      await writeRoom(room);
      const token = room.players[0].token;
      return reply({ ...view(room, token), token });
    }
    const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
    // A couple of quick retries absorb the rare clash when both players tap at the same moment.
    for (let attempt = 0; ; attempt++) {
      const { room, etag } = await readRoom(code);
      const result = transition(room, b, auth(req));
      if (result.room === room) return reply({ ...view(room, result.token ?? auth(req)), token: result.token });
      try {
        await writeRoom(result.room, etag);
        const token = result.token ?? auth(req);
        return reply({ ...view(result.room, token), token: result.token });
      } catch (e) {
        if (!(e instanceof GameError && e.status === 409) || attempt >= 2) throw e;
      }
    }
  } catch (e) { return error(e); }
}
