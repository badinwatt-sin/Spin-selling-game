// Up to five classes can run at once; each room has its own state, players and Post-it notebook.
export const roomCount = 5;
export const rooms = Array.from({ length: roomCount }, (_, i) => i + 1);
export function parseRoom(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= roomCount ? n : 1;
}
export const roomName = (room: number, label?: string | null) => label ? `ห้อง ${room} · ${label}` : `ห้อง ${room}`;
