// Post-it round timing, shared by the server and every screen.
export const postitMinutes = [2, 3, 5, 7, 10];
export const extendMinutes = [1, 2, 3, 5];
// Time left on a Post-it round; frozen while the trainer has paused it.
export const postitLeft = (a: { endsAt: number; pausedAt?: number | null }, now: number) => a.endsAt - (a.pausedAt ?? now);
