import 'server-only';
import { fail, type Room } from './game';
import { ConflictError, root, store } from './store';

const path = (code: string) => `${root}rooms/${code}.json`;

export async function readRoom(code: string) {
  if (!/^[A-Z2-9]{6}$/.test(code)) fail('กรุณาตรวจสอบรหัสห้อง 6 ตัว', 400);
  const result = await store.read<Room>(path(code));
  if (!result) return fail('ไม่พบห้อง กรุณาตรวจสอบรหัส', 404);
  if (result.data.expires <= Date.now()) fail('ห้องหมดอายุแล้ว กรุณาสร้างห้องใหม่', 410);
  return { room: result.data, etag: result.etag };
}

export async function writeRoom(room: Room, etag?: string) {
  try {
    await store.write(path(room.code), room, etag ? { etag } : { create: true });
  } catch (e) {
    if (e instanceof ConflictError) fail('ข้อมูลเพิ่งเปลี่ยน กรุณาลองอีกครั้ง', 409);
    throw e;
  }
}
