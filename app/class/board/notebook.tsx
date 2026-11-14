'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Download, Printer, RefreshCw } from 'lucide-react';
import { api, errorText } from '@/lib/client';
import { Brand, Notice, StageBadge } from '@/components/ui';
import { stages, type StageKey } from '@/lib/spin';
import { postit } from '@/lib/content';
import { roomName } from '@/lib/rooms';
import { download, renderWall } from '@/lib/postit-image';
import type { Notebook as Book } from '@/lib/server/classroom';
import { classUrl, PostitCard, stageOf, useRoom } from '../shared';

type Wall = Book['walls'][number];
const when = (t: number) => new Date(t).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = (t: number) => new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

// The class notebook: every Post-it wall revealed in this room, to read again, save as an image or print to PDF.
export default function Notebook() {
  const r = useRoom();
  const [book, setBook] = useState<Book>();
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<StageKey | 'all'>('all');
  const [starsOnly, setStarsOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string>();

  const load = async (room: number) => {
    try { setBook(await api<Book>(classUrl(room, '&as=board'))); setError(undefined); } catch (e) { setError(errorText(e)); }
  };
  useEffect(() => { if (r) void load(r.n); }, [r?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(undefined), 2200); return () => clearTimeout(t); }, [toast]);

  if (!r || (!book && !error)) return <main className="page"><div className="loading">กำลังโหลดสมุด Post-it…</div></main>;
  const room = r.n;
  const title = roomName(room, book?.label);
  const walls = (book?.walls ?? []).filter(w => filter === 'all' || w.stage === filter)
    .map(w => ({ ...w, notes: starsOnly ? w.notes.filter(n => n.star) : w.notes }))
    .filter(w => w.notes.length || !starsOnly);

  async function saveImage(w: Wall, i: number) {
    const s = stageOf(w.stage);
    setBusy(w.id);
    try {
      const blob = await renderWall({
        title: `${s.key} · ${s.name}`, subtitle: `SPIN Lab · สมุด Post-it · ${title} · กระดานที่ ${i + 1}`,
        prompt: postit[w.stage].prompt + (w.scenarioTitle ? ` (ลูกค้า${w.scenarioTitle})` : ''), color: s.color,
        footer: `${w.notes.length} ใบ · ${when(w.at)} · ★ = คำถามตัวอย่างที่ผู้สอนเลือก`, notes: w.notes,
      });
      const name = `postit-room${room}-${i + 1}-${w.stage}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      // On phones the share sheet offers "Save Image" to the photo library; elsewhere download the file.
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
        try { await nav.share({ files: [file], title: `Post-it ${s.key} · ${title}` }); } catch { /* cancelled */ }
      } else { download(blob, name); setToast('บันทึกรูปแล้ว'); }
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(null); }
  }

  async function copy(w: Wall) {
    const s = stageOf(w.stage);
    const text = [`Post-it ${s.key} · ${s.name} — ${title}`, postit[w.stage].prompt, '', ...w.notes.map((n, k) => `${k + 1}. ${n.star ? '★ ' : ''}${n.text} — ${n.name}`)].join('\n');
    try { await navigator.clipboard.writeText(text); setToast('คัดลอกข้อความแล้ว'); } catch { setError('คัดลอกไม่สำเร็จ ลองกดค้างที่ข้อความแทน'); }
  }

  return <main className="page notebook">
    <header className="topbar no-print">
      <Brand small />
      <div className="topbar-right">
        <a className="btn btn-ghost btn-sm" href={`/class?room=${room}`}><ArrowLeft size={16} /> กลับห้องเรียน</a>
      </div>
    </header>
    <section className="notebook-head">
      <span className="eyebrow">สมุด Post-it · {title}</span>
      <h1>คำถามที่ทั้งห้องช่วยกันคิด</h1>
      <p className="muted">{book ? `คลาสวันที่ ${day(book.startedAt)} · ${book.walls.length} กระดาน · ${book.walls.reduce((a, w) => a + w.notes.length, 0)} ใบ` : ''}</p>
      <p className="muted small no-print">เก็บไว้อ่านซ้ำได้ตลอดคลาส · กด “บันทึกเป็นรูป” เพื่อเก็บลงเครื่อง หรือ “พิมพ์ / PDF” เพื่อเก็บทั้งเล่ม (สมุดจะเริ่มใหม่เมื่อผู้สอนเริ่มคลาสใหม่)</p>
    </section>
    <Notice error={error} onClose={() => setError(undefined)} />
    {book && book.walls.length > 0 && <div className="notebook-tools no-print">
      <div className="segmented seg-tight">
        <button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>ทั้งหมด</button>
        {stages.map(s => <button type="button" key={s.key} className={filter === s.key ? 'on' : ''} onClick={() => setFilter(s.key)}>{s.key}</button>)}
      </div>
      <button type="button" className={`btn btn-sm ${starsOnly ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={starsOnly} onClick={() => setStarsOnly(v => !v)}>★ เฉพาะติดดาว</button>
      <span className="notebook-tools-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => load(room)}><RefreshCw size={16} /> อัปเดต</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => print()}><Printer size={16} /> พิมพ์ / PDF ทั้งเล่ม</button>
      </span>
    </div>}
    {book && book.walls.length === 0 && <div className="card wait-card"><h2>ยังไม่มีกระดาน</h2><p className="muted">เมื่อผู้สอนกด “ปิดรับ Post-it” กระดานนั้นจะถูกเก็บไว้ที่นี่ให้อ่านซ้ำและบันทึกได้</p></div>}
    {book && book.walls.length > 0 && walls.length === 0 && <p className="muted center">ไม่มี Post-it ตามตัวกรองนี้</p>}
    {walls.map(w => {
      const s = stageOf(w.stage);
      const i = book!.walls.findIndex(x => x.id === w.id);
      const full = book!.walls[i];
      return <article key={w.id} id={w.id} className="notebook-wall" style={{ '--c': s.color } as React.CSSProperties}>
        <header className="notebook-wall-head">
          <StageBadge k={s.key} size="lg" />
          <div>
            <span className="eyebrow">กระดานที่ {i + 1} · {when(w.at)} · {w.notes.length} ใบ</span>
            <h2>{s.name}</h2>
            <p>{postit[w.stage].prompt}{w.scenarioTitle && <> · ลูกค้า{w.scenarioTitle}</>}</p>
          </div>
          <div className="notebook-wall-actions no-print">
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy === w.id} onClick={() => saveImage(full, i)}><Download size={16} /> {busy === w.id ? 'กำลังสร้าง…' : 'บันทึกเป็นรูป'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(full)}><Copy size={16} /> คัดลอกข้อความ</button>
          </div>
        </header>
        {w.notes.length === 0 ? <p className="muted">กระดานนี้ไม่มี Post-it</p>
          : <div className="postit-wall notebook-notes">{w.notes.map((n, k) => <PostitCard key={k} n={n} i={k} color={s.color} />)}</div>}
      </article>;
    })}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
