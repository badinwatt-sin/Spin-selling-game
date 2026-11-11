import { root, store } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Hourly cron (vercel.json): rooms older than 4 h and class data older than 24 h are removed.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const now = Date.now();
  const stale = async (prefix: string, age: number, keep?: (p: string) => boolean) =>
    (await store.list(prefix)).filter(e => e.uploadedAt < now - age && !(keep?.(e.pathname))).map(e => e.pathname);
  const rooms = await stale(`${root}rooms/`, 4 * 3600_000);
  const cls = await stale(`${root}class/`, 24 * 3600_000, p => p.endsWith('class/state.json'));
  await store.remove([...rooms, ...cls]);
  return Response.json({ deleted: rooms.length + cls.length });
}
