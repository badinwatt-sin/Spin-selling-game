'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Flag, LogOut, Play, RotateCcw, Star, Trophy, Users, X } from 'lucide-react';
import { api, errorText, mmss, useClock } from '@/lib/client';
import { Bars, Brand, Notice, Qr, StageBadge, useOrigin } from '@/components/ui';
import { showtimeCriteria, stages, type StageKey } from '@/lib/spin';
import { postit, showtimeRubric } from '@/lib/content';
import { Countdown, Podium, PostitCard, PostitSpotlight, ShowtimeTable, stageOf, useClass, type ClassView, type FeedbackView, type PostitView, type QuizView, type WallNote } from './shared';
import { Ico, Sticker } from '@/components/icons';

const scenarioNames = ['แม่บ้าน', 'ข้าราชการ', 'พ่อค้า แม่ค้า', 'พนักงานบริษัทเอกชน', 'แพทย์ พยาบาล', 'นักธุรกิจ'];
type Act = (b: Record<string, unknown>) => Promise<void>;

// The primary button on each admin screen can also be triggered with Space or → (handy while presenting).
function usePrimaryKey(busy: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (busy || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === ' ' || e.key === 'ArrowRight') {
        const btn = document.querySelector<HTMLButtonElement>('[data-primary]:not([disabled])');
        if (btn) { e.preventDefault(); btn.click(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy]);
}
const Key = () => <kbd className="kbd">Space</kbd>;

export default function Admin() {
  const { data, setData, error: pollError } = useClass('admin', 1200);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const origin = useOrigin();
  usePrimaryKey(busy);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError(undefined);
    try { setData(await api<ClassView>('/api/class', { activityId: data?.activity?.id ?? null, ...body })); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  if (!data) return <main className="page"><div className="loading">{pollError ? errorText(pollError) : 'กำลังโหลด…'}</div></main>;
  if (!data.admin) return <Login ready={data.adminReady} onDone={() => location.reload()} />;
  const a = data.activity;

  return <main className="page admin-page">
    <header className="topbar">
      <Brand small />
      <div className="topbar-right">
        <span className="name-pill"><Users size={16} /> {data.people} คนเข้าร่วม</span>
        <a className="btn btn-ghost btn-sm" href="/class/display" target="_blank" rel="noreferrer"><ExternalLink size={16} /> เปิดจอ Live</a>
        <button type="button" className="icon-btn" aria-label="ออกจากระบบ" onClick={async () => { await api('/api/class', { action: 'logout' }); location.reload(); }}><LogOut size={18} /></button>
      </div>
    </header>
    <Notice error={error} onClose={() => setError(undefined)} />
    <div className="admin-grid">
      <section className="admin-main">
        {!a && <Start act={act} busy={busy} data={data} />}
        {a?.kind === 'quiz' && <QuizControl q={a} now={data.now} act={act} busy={busy} />}
        {a?.kind === 'feedback' && <FeedbackControl f={a} people={data.people} now={data.now} act={act} busy={busy} />}
        {a?.kind === 'postit' && <PostitControl p={a} people={data.people} now={data.now} act={act} busy={busy} />}
        {a?.kind === 'recap' && <><h1 className="admin-title"><Ico name="trophy" /> สรุป SHOW TIME ทุกคู่</h1><div className="card control"><ShowtimeTable rows={data.showtime} />
          <button type="button" data-primary className="btn btn-primary btn-lg" disabled={busy} onClick={() => act({ action: 'clear' })}>กลับหน้าเลือกกิจกรรม <Key /></button></div></>}
      </section>
      <aside className="admin-side">
        <div className="card join-box">
          <span className="eyebrow">ให้ผู้เรียนสแกนเข้าร่วม</span>
          {origin && <Qr url={`${origin}/class`} size={180} />}
          <b className="join-url">{origin.replace(/^https?:\/\//, '')}/class</b>
        </div>
        {a && <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => confirm('ปิดกิจกรรมนี้และกลับไปหน้าเลือกกิจกรรม?') && act({ action: 'clear' })}><X size={18} /> ปิดกิจกรรมนี้</button>}
        <p className="muted small"><Ico name="idea" /> กด <Key /> หรือ → เพื่อกดปุ่มหลักของหน้าจอ</p>
      </aside>
    </div>
    <details className="danger-zone">
      <summary>ตั้งค่าคลาส</summary>
      <button type="button" className="btn btn-danger-ghost" disabled={busy} onClick={() => confirm('เริ่มคลาสใหม่? ผู้เรียนทุกคนต้องใส่ชื่อเข้าร่วมใหม่ คะแนนและผล Show Time ทั้งหมดจะถูกล้าง') && act({ action: 'new-class' })}><RotateCcw size={18} /> เริ่มคลาสใหม่ (ล้างทั้งหมด)</button>
    </details>
  </main>;
}

function Login({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return <main className="page">
    <header className="topbar"><Brand small /></header>
    <form className="card join-card" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(undefined);
      try { await api('/api/class', { action: 'login', key }); onDone(); } catch (err) { setError(errorText(err)); setBusy(false); }
    }}>
      <span className="eyebrow">สำหรับผู้สอน / Mentor / Training Coach</span>
      <h1>เข้าสู่ระบบผู้สอน</h1>
      {!ready && <p className="notice-soft">ยังไม่ได้ตั้งค่า <code>LIVE_ADMIN_KEY</code> ใน Vercel Environment Variables</p>}
      <Notice error={error} />
      <label className="field">รหัสผู้สอน<input type="password" value={key} onChange={e => setKey(e.target.value)} required autoFocus autoComplete="current-password" /></label>
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !ready}>เข้าสู่ระบบ <ArrowRight size={20} /></button>
    </form>
  </main>;
}

function Start({ act, busy, data }: { act: Act; busy: boolean; data: ClassView }) {
  const [count, setCount] = useState(10);
  const [time, setTime] = useState(20);
  const [maxPoints, setMaxPoints] = useState(1000);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [stage, setStage] = useState<StageKey>('S');
  const [pMinutes, setPMinutes] = useState(3);
  const [pScenario, setPScenario] = useState(-1);
  const [advisor, setAdvisor] = useState('');
  const [customer, setCustomer] = useState('');
  const [scenario, setScenario] = useState(-1);
  const [minutes, setMinutes] = useState(10);
  const done = data.showtime.length;
  return <>
    <h1 className="admin-title">เลือกกิจกรรมทั้งคลาส</h1>
    <p className="muted">ลำดับแนะนำตามบทเรียน: สอน 1 ขั้น → Post-it ขั้นนั้น → (ครบ 4 ขั้น) เกมทาย SPIN → ฝึกเป็นคู่ → SHOW TIME 3 คู่</p>
    <div className="activity-cards">
      <form className="card activity" onSubmit={e => { e.preventDefault(); act({ action: 'postit-start', stage, minutes: pMinutes, scenario: pScenario }); }}>
        <Sticker name="note" tone="yellow" size={26} tilt={-6} />
        <h2>Post-it คิดคำถาม</h2>
        <p>ทุกคนเขียนคำถาม 1 ข้อสำหรับขั้นที่เลือก แล้วเปิดกระดานพร้อมกันบนจอ ผู้สอนติดดาวคำถามที่ดี</p>
        <div className="field">ขั้น
          <div className="segmented">{stages.map(s => <button type="button" key={s.key} className={stage === s.key ? 'on' : ''} onClick={() => setStage(s.key)}>{s.key} · {s.thai}</button>)}</div>
        </div>
        <label className="field">โจทย์ลูกค้า
          <select value={pScenario} onChange={e => setPScenario(Number(e.target.value))}><option value={-1}>ลูกค้าทั่วไป</option>{scenarioNames.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
        </label>
        <div className="field">เวลา
          <div className="segmented">{[2, 3, 5].map(m => <button type="button" key={m} className={pMinutes === m ? 'on' : ''} onClick={() => setPMinutes(m)}>{m} นาที</button>)}</div>
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}><Play size={20} /> เริ่ม Post-it</button>
      </form>
      <form className="card activity" onSubmit={e => { e.preventDefault(); act({ action: 'quiz-setup', count, timeLimit: time, maxPoints, speedBonus }); }}>
        <Sticker name="target" tone="red" size={26} tilt={4} />
        <h2>เกมทาย SPIN</h2>
        <p>ขึ้นประโยคของตัวแทน ให้ทั้งห้องตอบว่าเป็น S / P / I / N ตอบถูกและเร็วได้คะแนนมาก สรุป 3 อันดับแรก (คลัง 40 ข้อ สุ่มแบบสมดุล)</p>
        <label className="field">จำนวนคำถาม: <b>{count} ข้อ</b>
          <input type="range" min={3} max={20} value={count} onChange={e => setCount(Number(e.target.value))} />
        </label>
        <div className="field">เวลาต่อข้อ
          <div className="segmented">{[10, 15, 20, 30].map(t => <button type="button" key={t} className={time === t ? 'on' : ''} onClick={() => setTime(t)}>{t} วิ</button>)}</div>
        </div>
        <div className="field">คะแนนสูงสุดต่อข้อ
          <div className="segmented seg-tight">{[100, 500, 1000, 2000].map(p => <button type="button" key={p} className={maxPoints === p ? 'on' : ''} onClick={() => setMaxPoints(p)}>{p.toLocaleString()}</button>)}</div>
        </div>
        <div className="field">วิธีคิดคะแนน
          <div className="segmented">
            <button type="button" className={speedBonus ? 'on' : ''} onClick={() => setSpeedBonus(true)}>ถูก + เร็ว</button>
            <button type="button" className={!speedBonus ? 'on' : ''} onClick={() => setSpeedBonus(false)}>ถูกได้เต็ม</button>
          </div>
          <small className="muted">{speedBonus ? `ตอบถูกได้ ${(maxPoints / 2).toLocaleString()}–${maxPoints.toLocaleString()} ตามความเร็ว` : `ตอบถูกได้ ${maxPoints.toLocaleString()} ทุกคน ไม่คิดความเร็ว`} · เต็มทั้งเกม {(maxPoints * count).toLocaleString()} คะแนน</small>
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}><Play size={20} /> เตรียมเกม ({count} ข้อ)</button>
      </form>
      <form className="card activity" onSubmit={e => { e.preventDefault(); act({ action: 'feedback-start', advisor, customer, scenario, minutes }); }}>
        <Sticker name="mic" tone="blue" size={26} tilt={-3} />
        <h2>SHOW TIME · Feedback คู่หน้าห้อง</h2>
        <p>SPIN + Present Solution 1 คู่หน้าห้อง ผู้สอนกดจบเอง แล้วทั้งห้องให้คะแนน “ตัวแทน” 6 ด้าน สรุปผลขึ้นจอ Live {done > 0 && <b>· เล่นไปแล้ว {done} คู่</b>}</p>
        <label className="field">ผู้รับบทตัวแทน (ผู้ถูกประเมิน)<input value={advisor} onChange={e => setAdvisor(e.target.value)} maxLength={40} required placeholder="เช่น ต้น" /></label>
        <label className="field">ผู้รับบทลูกค้า<input value={customer} onChange={e => setCustomer(e.target.value)} maxLength={40} placeholder="เช่น ฝน" /></label>
        <label className="field">การ์ดลูกค้า
          <select value={scenario} onChange={e => setScenario(Number(e.target.value))}><option value={-1}>ไม่ระบุ</option>{scenarioNames.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
        </label>
        <div className="field">เวลา
          <div className="segmented">{[5, 8, 10, 12, 15].map(m => <button type="button" key={m} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>{m}</button>)}</div>
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}><Play size={20} /> เริ่ม Role Play</button>
        {done > 0 && <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => act({ action: 'recap' })}><Trophy size={18} /> สรุปทุกคู่บนจอ ({done})</button>}
      </form>
    </div>
  </>;
}

function QuizControl({ q, now: serverNow, act, busy }: { q: QuizView; now: number; act: Act; busy: boolean }) {
  const now = useClock(serverNow, 200);
  const autoRevealed = useRef('');
  const key = `${q.id}:${q.index}`;
  useEffect(() => {
    if (q.phase === 'question' && q.closesAt && now > q.closesAt + 1500 && autoRevealed.current !== key && !busy) {
      autoRevealed.current = key; void act({ action: 'quiz-reveal' });
    }
  }, [now, q.phase, q.closesAt, key, act, busy]);
  const last = q.index + 1 >= q.total;
  return <>
    <h1 className="admin-title"><Ico name="target" /> เกมทาย SPIN <small>{q.total} ข้อ · ข้อละ {q.timeLimit} วินาที · สูงสุด {q.maxPoints.toLocaleString()} คะแนน/ข้อ{q.speedBonus ? '' : ' (ไม่คิดความเร็ว)'}</small></h1>
    {q.phase === 'lobby' && <div className="card control">
      <p>ให้ผู้เรียนสแกน QR เข้าร่วม แล้วเปิดจอ Live ขึ้นโปรเจกเตอร์</p>
      <button type="button" data-primary className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: 'quiz-open' })}><Play size={22} /> เปิดข้อที่ 1 <Key /></button>
    </div>}
    {q.phase === 'question' && q.question && <div className="card control">
      <div className="quiz-head"><span>ข้อ {q.index + 1} / {q.total}</span><Countdown closesAt={q.closesAt} openedAt={q.openedAt} now={now} /></div>
      <p className="context">{q.question.context}</p>
      <p className="admin-quote">“{q.question.line}”</p>
      <p className="big-stat"><b>{q.answered}</b> คนตอบแล้ว</p>
      <button type="button" data-primary className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: 'quiz-reveal' })}>เฉลยเลย <Key /></button>
      <p className="muted small">ระบบเฉลยให้อัตโนมัติเมื่อหมดเวลา (เปิดหน้านี้ค้างไว้)</p>
    </div>}
    {q.phase === 'reveal' && q.reveal && <div className="card control">
      <div className="quiz-head"><span>เฉลยข้อ {q.index + 1} / {q.total}</span><span>{q.reveal.answered} คนตอบ</span></div>
      <div className="reveal-answer"><StageBadge k={q.reveal.answer} size="lg" /><div><b>{stageOf(q.reveal.answer).name}</b><span>{q.reveal.why}</span></div></div>
      <Distribution q={q} />
      <button type="button" data-primary className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: last ? 'quiz-final' : 'quiz-open' })}>
        {last ? <><Trophy size={22} /> ดูผล 3 อันดับแรก</> : <>ข้อถัดไป ({q.index + 2}/{q.total}) <ArrowRight size={22} /></>} <Key /></button>
    </div>}
    {q.phase === 'final' && <div className="card control">
      <Podium board={q.board} />
      <ol className="board">{q.board.slice(3).map((p, i) => <li key={p.pid}><span>#{i + 4}</span><b>{p.name}</b><span>{p.score.toLocaleString()}</span></li>)}</ol>
      <button type="button" data-primary className="btn btn-primary btn-lg" disabled={busy} onClick={() => act({ action: 'clear' })}>จบเกม กลับหน้าเลือกกิจกรรม <Key /></button>
    </div>}
    {q.board.length > 0 && q.phase !== 'final' && <div className="card"><span className="eyebrow">กระดานคะแนน</span>
      <ol className="board">{q.board.slice(0, 10).map((p, i) => <li key={p.pid}><span>#{i + 1}</span><b>{p.name}</b><span>{p.score.toLocaleString()}</span></li>)}</ol></div>}
  </>;
}

export function Distribution({ q }: { q: QuizView }) {
  const r = q.reveal!;
  const max = Math.max(1, ...Object.values(r.counts));
  return <div className="dist">{stages.map(s => <div key={s.key} className={`dist-col ${s.key === r.answer ? 'right' : ''}`} style={{ '--c': s.color } as React.CSSProperties}>
    <span className="dist-n">{r.counts[s.key]}</span>
    <span className="dist-bar"><i style={{ height: `${(r.counts[s.key] / max) * 100}%` }} /></span>
    <b className="dist-key">{s.key}{s.key === r.answer ? ' ✓' : ''}</b>
  </div>)}</div>;
}

function Rubric() {
  return <details className="disclosure rubric">
    <summary>เกณฑ์ให้คะแนนสำหรับ Mentor / Coach</summary>
    <table><thead><tr><th>ด้าน</th><th>1 · ต้องฝึก</th><th>3 · พอใช้</th><th>5 · ยอดเยี่ยม</th></tr></thead>
      <tbody>{showtimeRubric.map(r => <tr key={r.key}><th>{r.label}</th><td>{r.look1}</td><td>{r.look3}</td><td>{r.look5}</td></tr>)}</tbody></table>
  </details>;
}

function FeedbackControl({ f, people, now: serverNow, act, busy }: { f: FeedbackView; people: number; now: number; act: Act; busy: boolean }) {
  const now = useClock(serverNow, 1000);
  const left = f.startedAt + f.duration * 1000 - now;
  return <>
    <h1 className="admin-title"><Ico name="mic" /> SHOW TIME · Feedback คู่หน้าห้อง</h1>
    <div className="card control">
      <p className="pair-line"><b><Ico name="advisor" /> {f.advisor}</b> (ตัวแทน){f.customer && <> × <b><Ico name="customer" /> {f.customer}</b></>}{f.scenarioTitle && <> · ลูกค้า{f.scenarioTitle}</>}</p>
      {f.phase === 'roleplay' && <>
        <p className="big-stat"><b className={left < 0 ? 'over' : ''}>{left >= 0 ? mmss(left) : `+${mmss(-left)}`}</b> {left >= 0 ? 'เหลือเวลา' : 'เกินเวลา'}</p>
        <button type="button" data-primary className="btn btn-finish btn-xl" disabled={busy} onClick={() => act({ action: 'feedback-end' })}><Flag size={22} /> จบ Role Play · เปิดรับ Feedback <Key /></button>
      </>}
      {f.phase === 'voting' && <>
        <p className="big-stat"><b>{f.ballots}</b> / {people} คนส่ง Feedback แล้ว</p>
        <button type="button" data-primary className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: 'feedback-close' })}>ปิดรับ · แสดงผลบนจอ Live <Key /></button>
      </>}
      {f.phase === 'results' && f.summary && <>
        <div className="avg avg-inline"><b>{f.summary.overall ?? '–'}</b><span>/ 5 · จาก {f.summary.count} คน</span></div>
        <Bars values={f.summary.criteria} list={showtimeCriteria} />
        {(f.summary.strengths.length > 0 || f.summary.improves.length > 0) && <div className="tag-cloud-wrap">
          <div className="tag-cloud good">{f.summary.strengths.map(t => <span key={t.tag}>{t.tag} <b>{t.count}</b></span>)}</div>
          <div className="tag-cloud warn">{f.summary.improves.map(t => <span key={t.tag}>{t.tag} <b>{t.count}</b></span>)}</div>
        </div>}
        {f.summary.notes.length > 0 && <div className="notes notes-admin">{f.summary.notes.map((n, i) => <div key={i} className="note">{n.good && <p><Ico name="like" /> {n.good}</p>}{n.tip && <p><Ico name="idea" /> {n.tip}</p>}</div>)}</div>}
        <div className="sticky-actions">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act({ action: 'feedback-reopen' })}>เปิดรับ Feedback เพิ่ม</button>
          <button type="button" data-primary className="btn btn-primary btn-lg" disabled={busy} onClick={() => act({ action: 'clear' })}>คู่ถัดไป <ArrowRight size={20} /> <Key /></button>
        </div>
      </>}
    </div>
    <Rubric />
  </>;
}

function PostitControl({ p, people, now: serverNow, act, busy }: { p: PostitView; people: number; now: number; act: Act; busy: boolean }) {
  const now = useClock(serverNow, 500);
  const s = stageOf(p.stage);
  const left = p.endsAt - now;
  const notes = p.notes as WallNote[];
  const [local, setLocal] = useState<string | null | undefined>(undefined);
  const focusId = local !== undefined ? local : p.focus;
  useEffect(() => { setLocal(undefined); }, [p.focus]);
  const index = notes.findIndex(n => n.pid === focusId);
  const open = index >= 0 ? notes[index] : null;
  const focus = (pid: string | null) => { setLocal(pid); void act({ action: 'postit-focus', pid }); };
  const star = (pid?: string) => pid && act({ action: 'postit-star', pid });
  const step = (d: number) => { if (notes.length) focus(notes[(index + d + notes.length) % notes.length].pid ?? null); };

  // While a note is open: Esc / Space close it, ← → move between notes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); focus(null); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); step(-1); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  return <>
    <h1 className="admin-title"><Ico name="note" /> Post-it · {s.name}</h1>
    <div className="card control">
      <p className="admin-quote">{postit[p.stage].prompt}</p>
      {p.scenarioTitle && <p>โจทย์ลูกค้า: <b>{p.scenarioTitle}</b> — {p.scenarioBrief}</p>}
      <p className="mentor-hint"><Ico name="compass" /> Mentor: {postit[p.stage].mentorHint}</p>
      <div className="postit-status">
        <span className={`live-pill ${p.phase === 'writing' ? 'on' : ''}`}>{p.phase === 'writing' ? '● LIVE · ขึ้นจอทันทีที่ส่ง' : 'ปิดรับแล้ว'}</span>
        <b>{p.written}</b> / {people} คนแปะแล้ว
        {p.phase === 'writing' && <span className="muted postit-left">{left > 0 ? `เหลือ ${mmss(left)}` : 'หมดเวลา'}</span>}
        <span className="postit-status-action">{p.phase === 'writing'
          ? <button type="button" data-primary={open ? undefined : true} className="btn btn-primary" disabled={busy} onClick={() => act({ action: 'postit-reveal' })}>ปิดรับ Post-it <Key /></button>
          : <button type="button" data-primary={open ? undefined : true} className="btn btn-primary" disabled={busy} onClick={() => act({ action: 'clear' })}>จบกิจกรรม <ArrowRight size={18} /> <Key /></button>}</span>
      </div>
      <p className="muted small">แตะ Post-it เพื่อขยายเต็มจอ (ขึ้นบนจอ Live ด้วย) · แตะ ★ เพื่อติดดาวคำถามตัวอย่างที่ดี</p>
      {notes.length === 0 ? <div className="postit-empty">ยังไม่มีใครส่ง Post-it · ใบแรกจะขึ้นตรงนี้ทันที</div>
        : <div className="postit-wall postit-wall-admin">{notes.map((n, i) => <PostitCard key={n.pid ?? i} n={n} i={i} color={s.color}
          onOpen={() => focus(n.pid ?? null)} onStar={() => star(n.pid)} />)}</div>}
    </div>
    {open && <PostitSpotlight n={open} color={s.color} stage={`${s.key} · ${s.name}`} onClose={() => focus(null)} onStar={() => star(open.pid)}
      onPrev={notes.length > 1 ? () => step(-1) : undefined} onNext={notes.length > 1 ? () => step(1) : undefined} />}
  </>;
}
