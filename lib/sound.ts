'use client';
// Game-show sound effects and music, synthesised with the Web Audio API (no audio files to load).
// Browsers only allow sound after a user gesture, so call `unlock()` from a click/tap handler.
import { useEffect, useState } from 'react';

type Sfx = 'tap' | 'join' | 'tick' | 'tickFast' | 'timeUp' | 'correct' | 'wrong' | 'reveal' | 'whoosh' | 'drum' | 'fanfare' | 'react' | 'star';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicKind: string | null = null;
const KEY = 'spin-sound';

function muted() { try { return localStorage.getItem(KEY) === 'off'; } catch { return false; } }

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted() ? 0 : 0.6; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(master);
  }
  return ctx;
}

export function unlock() { const c = audio(); if (c && c.state === 'suspended') void c.resume(); }
export function isUnlocked() { return ctx?.state === 'running'; }

function tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; vol?: number; to?: number; out?: AudioNode } = {}) {
  const c = audio(); if (!c || !master) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, start);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
  const v = opts.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(v, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(opts.out ?? master);
  o.start(start); o.stop(start + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.2, out?: AudioNode) {
  const c = audio(); if (!c || !master) return;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 900;
  src.buffer = buf; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(out ?? master);
  src.start(start);
}

export function play(name: Sfx) {
  const c = audio(); if (!c || muted()) return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime + 0.01;
  const notes = (seq: number[], step: number, o: { type?: OscillatorType; vol?: number; len?: number } = {}) =>
    seq.forEach((f, i) => tone(f, t + i * step, o.len ?? step * 1.6, { type: o.type ?? 'triangle', vol: o.vol ?? 0.25 }));
  switch (name) {
    case 'tap': tone(660, t, 0.08, { type: 'square', vol: 0.12, to: 990 }); break;
    case 'react': tone(520, t, 0.12, { type: 'sine', vol: 0.2, to: 880 }); break;
    case 'join': notes([784, 1175], 0.07, { vol: 0.18 }); break;
    case 'tick': tone(1200, t, 0.05, { type: 'square', vol: 0.08 }); break;
    case 'tickFast': tone(1500, t, 0.06, { type: 'square', vol: 0.14 }); break;
    case 'timeUp': tone(330, t, 0.5, { type: 'sawtooth', vol: 0.2, to: 220 }); tone(165, t, 0.6, { type: 'sine', vol: 0.3 }); break;
    case 'correct': notes([523, 659, 784, 1047], 0.08, { vol: 0.25 }); break;
    case 'wrong': tone(220, t, 0.25, { type: 'sawtooth', vol: 0.18, to: 150 }); tone(207, t + 0.22, 0.35, { type: 'sawtooth', vol: 0.18, to: 120 }); break;
    case 'reveal': notes([392, 523, 659], 0.06, { vol: 0.22 }); noise(t, 0.25, 0.08); break;
    case 'whoosh': noise(t, 0.35, 0.12); tone(200, t, 0.3, { vol: 0.08, to: 900 }); break;
    case 'star': notes([1047, 1319, 1568], 0.05, { type: 'sine', vol: 0.18 }); break;
    case 'drum': for (let i = 0; i < 18; i++) noise(t + i * 0.07, 0.06, 0.05 + i * 0.008); break;
    case 'fanfare':
      notes([523, 523, 523, 659, 784], 0.12, { vol: 0.25, len: 0.18 });
      [523, 659, 784, 1047].forEach(f => tone(f, t + 0.65, 1.1, { type: 'triangle', vol: 0.16 }));
      break;
  }
}

// Short looping music beds: a relaxed lobby groove and a tense "thinking" loop for open questions.
const loops: Record<string, { bpm: number; bass: number[]; lead: (number | 0)[] }> = {
  lobby: { bpm: 112, bass: [196, 196, 262, 262, 220, 220, 175, 175], lead: [784, 0, 659, 0, 523, 659, 0, 784, 880, 0, 784, 0, 659, 0, 523, 0] },
  think: { bpm: 132, bass: [147, 147, 147, 175, 147, 147, 196, 175], lead: [587, 0, 0, 587, 698, 0, 0, 0, 587, 0, 0, 587, 784, 0, 698, 0] },
};
export function music(kind: 'lobby' | 'think' | null) {
  if (kind === musicKind) return;
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  musicKind = kind;
  const c = audio(); if (!kind || !c || !musicGain) return;
  const L = loops[kind]; const beat = 60 / L.bpm / 2; let step = 0;
  const run = () => {
    if (muted() || c.state !== 'running') { step++; return; }
    const t = c.currentTime + 0.05;
    const b = L.bass[Math.floor(step / 2) % L.bass.length];
    if (step % 2 === 0) tone(b, t, beat * 1.8, { type: 'triangle', vol: 0.22, out: musicGain! });
    const n = L.lead[step % L.lead.length];
    if (n) tone(n, t, beat * 0.9, { type: 'square', vol: 0.05, out: musicGain! });
    if (step % 4 === 0) noise(t, 0.04, 0.05, musicGain!);
    step++;
  };
  musicTimer = setInterval(run, beat * 1000);
}

export function useSound() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(!muted()), []);
  const toggle = () => {
    const next = !on; setOn(next);
    try { localStorage.setItem(KEY, next ? 'on' : 'off'); } catch { /* ignore */ }
    unlock();
    if (master) master.gain.value = next ? 0.6 : 0;
  };
  return { on, toggle };
}
