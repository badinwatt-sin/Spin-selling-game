'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }

export async function api<T = any>(url: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    cache: 'no-store',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง', res.status);
  return data as T;
}

export const errorText = (e: unknown) => e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง';

// Polls `load` while the tab is visible. `delay` can change between calls (faster during live play).
export function usePoll<T>(load: (() => Promise<T>) | null, delay: number) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const loadRef = useRef(load); loadRef.current = load;
  const delayRef = useRef(delay); delayRef.current = delay;
  const tick = useRef(0);
  const refresh = useCallback(() => { tick.current++; }, []);
  useEffect(() => {
    if (!load) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      try {
        if (!document.hidden && loadRef.current) { const d = await loadRef.current(); if (!stopped) { setData(d); setError(undefined); } }
      } catch (e) { if (!stopped) setError(e); }
      finally { if (!stopped) timer = setTimeout(run, delayRef.current); }
    };
    void run();
    const wake = () => { if (!document.hidden) { clearTimeout(timer); void run(); } };
    document.addEventListener('visibilitychange', wake);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', wake); };
  }, [load === null]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, setData, error, refresh };
}

// Server-synced clock: pass the server's `now` from each response.
export function useClock(serverNow?: number, every = 250) {
  const offset = useRef(0);
  useEffect(() => { if (serverNow) offset.current = serverNow - Date.now(); }, [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), every); return () => clearInterval(t); }, [every]);
  return now + offset.current;
}

export function mmss(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function useStored<T>(key: string) {
  const [value, setValue] = useState<T | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setValue(JSON.parse(raw)); } catch { /* private mode */ }
    setLoaded(true);
  }, [key]);
  const save = useCallback((v: T | null) => {
    setValue(v);
    try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  }, [key]);
  return [value, save, loaded] as const;
}
