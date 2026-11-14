'use client';
// Draws one Post-it wall as a PNG (works offline, no library). Thai has no spaces between words,
// so lines are broken at word boundaries with Intl.Segmenter.

export type WallImage = {
  title: string; subtitle: string; prompt: string; color: string; footer: string;
  notes: { name: string; text: string; star: boolean }[];
};

const UI = "'IBM Plex Sans Thai', 'Bricolage Grotesque', system-ui, sans-serif";
const HEAD = "'Noto Serif Thai', 'Fraunces', Georgia, serif";
const INK = '#0b0b3b', PAPER = '#f6f2ea';

function words(text: string) {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
  const parts = Seg ? [...new Seg('th', { granularity: 'word' }).segment(text)].map(s => s.segment) : text.split(/(\s+)/);
  // Keep closing punctuation and the spaced-out word before it together, so a line never starts with ")" or "”".
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && /^[)\]}”’,.!?:;…ๆ]+$/.test(p)) out[out.length - 1] += p;
    else out.push(p);
  }
  return out;
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const w of words(text)) {
    const next = line + w;
    if (ctx.measureText(next).width <= width || !line) {
      // A single word wider than the line (e.g. a long URL) is split by character.
      if (!line && ctx.measureText(w).width > width) {
        for (const ch of w) { if (ctx.measureText(line + ch).width > width && line) { lines.push(line); line = ''; } line += ch; }
      } else line = next;
    } else { lines.push(line.trimEnd()); line = w.trimStart(); }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

export async function renderWall(w: WallImage): Promise<Blob> {
  try { await Promise.all([document.fonts.load(`600 30px ${UI}`, 'กขคabc'), document.fonts.load(`700 52px ${HEAD}`, 'กขคabc')]); } catch { /* fall back to system fonts */ }
  const W = 1600, pad = 64, gap = 28;
  const cols = w.notes.length <= 4 ? 2 : w.notes.length <= 9 ? 3 : 4;
  const cellW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const textSize = cols === 4 ? 26 : 30, lineH = Math.round(textSize * 1.5);
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `500 ${textSize}px ${UI}`;
  const noteLines = w.notes.map(n => wrap(measure, n.text, cellW - 56));
  const cellH = (i: number) => 44 + noteLines[i].length * lineH + 70;
  measure.font = `600 30px ${UI}`;
  const promptLines = wrap(measure, w.prompt, W - pad * 2 - 40);
  const headH = 200 + promptLines.length * 44 + 20;
  const rowH: number[] = [];
  for (let i = 0; i < w.notes.length; i += cols) rowH.push(Math.max(...w.notes.slice(i, i + cols).map((_, j) => cellH(i + j))));
  const H = headH + 40 + rowH.reduce((a, b) => a + b + gap, 0) + 90;

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  // Header band
  ctx.fillStyle = w.color; ctx.fillRect(0, 0, W, headH);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  ctx.font = `600 26px ${UI}`; ctx.fillText(w.subtitle, pad, 52);
  ctx.font = `700 52px ${HEAD}`; ctx.fillText(w.title, pad, 92);
  ctx.font = `500 30px ${UI}`;
  promptLines.forEach((l, i) => ctx.fillText(l, pad, 176 + i * 44));

  let y = headH + 40;
  w.notes.forEach((n, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    if (col === 0 && row > 0) y += rowH[row - 1] + gap;
    const x = pad + col * (cellW + gap), h = rowH[row];
    ctx.fillStyle = INK; ctx.fillRect(x + 6, y + 6, cellW, h); // hard shadow
    ctx.fillStyle = n.star ? '#ffe46b' : '#fff6c2'; ctx.fillRect(x, y, cellW, h);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x, y, cellW, h);
    ctx.fillStyle = w.color; ctx.fillRect(x, y, cellW, 10);
    ctx.fillStyle = INK; ctx.font = `500 ${textSize}px ${UI}`;
    noteLines[i].forEach((l, k) => ctx.fillText(l, x + 28, y + 40 + k * lineH));
    ctx.font = `600 22px ${UI}`; ctx.fillStyle = '#3a3a6a';
    ctx.fillText(`— ${n.name}`, x + 28, y + h - 46);
    if (n.star) { ctx.fillStyle = '#c47f00'; ctx.font = `700 30px ${UI}`; ctx.fillText('★', x + cellW - 52, y + h - 52); }
  });
  ctx.fillStyle = '#3a3a6a'; ctx.font = `500 22px ${UI}`;
  ctx.fillText(w.footer, pad, H - 58);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('สร้างรูปไม่สำเร็จ')), 'image/png'));
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
