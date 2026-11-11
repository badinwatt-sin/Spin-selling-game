'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Flag, LogOut, Play, RotateCcw, Trophy, Users, X } from 'lucide-react';
import { api, errorText, mmss, useClock } from '@/lib/client';
import { Bars, Brand, Notice, Qr, StageBadge, useOrigin } from '@/components/ui';
import { stages } from '@/lib/spin';
import { Countdown, Podium, stageOf, useClass, type ClassView, type FeedbackView, type QuizView } from './shared';

const scenarioNames = ['แม่บ้าน', 'ข้าราชการ', 'พ่อค้า แม่ค้า', 'พนักงานบริษัทเอกชน', 'แพทย์ พยาบาล', 'นักธุรกิจ'];

export default function Admin() {
  const { data, setData, error: pollError } = useClass('admin', 1200);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const origin = useOrigin();

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
        {!a && <Start act={act} busy={busy} />}
        {a?.kind === 'quiz' && <QuizControl q={a} now={data.now} act={act} busy={busy} />}
        {a?.kind === 'feedback' && <FeedbackControl f={a} people={data.people} now={data.now} act={act} busy={busy} />}
      </section>
      <aside className="admin-side">
        <div className="card join-box">
          <span className="eyebrow">ให้ผู้เรียนสแกนเข้าร่วม</span>
          {origin && <Qr url={`${origin}/class`} size={180} />}
          <b className="join-url">{origin.replace(/^https?:\/\//, '')}/class</b>
        </div>
        {a && <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => confirm('ปิดกิจกรรมนี้และกลับไปหน้าเลือกกิจกรรม?') && act({ action: 'clear' })}><X size={18} /> ปิดกิจกรรมนี้</button>}
        <button type="button" className="btn btn-danger-ghost btn-block" disabled={busy} onClick={() => confirm('เริ่มคลาสใหม่? ผู้เรียนทุกคนต้องใส่ชื่อเข้าร่วมใหม่ และคะแนนทั้งหมดจะถูกล้าง') && act({ action: 'new-class' })}><RotateCcw size={18} /> เริ่มคลาสใหม่ (ล้างทั้งหมด)</button>
      </aside>
    </div>
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
      <span className="eyebrow">สำหรับผู้สอน / Training Coach</span>
      <h1>เข้าสู่ระบบผู้สอน</h1>
      {!ready && <p className="notice-soft">ยังไม่ได้ตั้งค่า <code>LIVE_ADMIN_KEY</code> ใน Vercel Environment Variables</p>}
      <Notice error={error} />
      <label className="field">รหัสผู้สอน<input type="password" value={key} onChange={e => setKey(e.target.value)} required autoFocus autoComplete="current-password" /></label>
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !ready}>เข้าสู่ระบบ <ArrowRight size={20} /></button>
    </form>
  </main>;
}

type Act = (b: Record<string, unknown>) => Promise<void>;

function Start({ act, busy }: { act: Act; busy: boolean }) {
  const [count, setCount] = useState(10);
  const [time, setTime] = useState(20);
  const [advisor, setAdvisor] = useState('');
  const [customer, setCustomer] = useState('');
  const [scenario, setScenario] = useState(-1);
  return <>
    <h1 className="admin-title">เลือกกิจกรรมทั้งคลาส</h1>
    <div className="activity-cards">
      <form className="card activity" onSubmit={e => { e.preventDefault(); act({ action: 'quiz-setup', count, timeLimit: time }); }}>
        <span className="activity-icon">🎯</span>
        <h2>เกมทาย SPIN</h2>
        <p>ขึ้นประโยคของตัวแทน ให้ทั้งห้องตอบว่าเป็น S / P / I / N ตอบถูกและเร็วได้คะแนนมาก สรุป 3 อันดับแรก</p>
        <label className="field">จำนวนคำถาม: <b>{count} ข้อ</b>
          <input type="range" min={3} max={20} value={count} onChange={e => setCount(Number(e.target.value))} />
        </label>
        <div className="field">เวลาต่อข้อ
          <div className="segmented">{[10, 15, 20, 30].map(t => <button type="button" key={t} className={time === t ? 'on' : ''} onClick={() => setTime(t)}>{t} วิ</button>)}</div>
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}><Play size={20} /> เตรียมเกม ({count} ข้อ)</button>
      </form>
      <form className="card activity" onSubmit={e => { e.preventDefault(); act({ action: 'feedback-start', advisor, customer, scenario }); }}>
        <span className="activity-icon">🎤</span>
        <h2>Feedback คู่หน้าห้อง</h2>
        <p>1 คู่ Role Play หน้าห้อง ผู้สอนกดจบเอง แล้วทั้งห้องให้คะแนน “ตัวแทน” สรุปผลขึ้นจอ Live</p>
        <label className="field">ผู้รับบทตัวแทน (ผู้ถูกประเมิน)<input value={advisor} onChange={e => setAdvisor(e.target.value)} maxLength={40} required placeholder="เช่น ต้น" /></label>
        <label className="field">ผู้รับบทลูกค้า<input value={customer} onChange={e => setCustomer(e.target.value)} maxLength={40} placeholder="เช่น ฝน" /></label>
        <label className="field">การ์ดลูกค้า
          <select value={scenario} onChange={e => setScenario(Number(e.target.value))}>
            <option value={-1}>ไม่ระบุ</option>{scenarioNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </label>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}><Play size={20} /> เริ่ม Role Play</button>
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
    <h1 className="admin-title">🎯 เกมทาย SPIN <small>{q.total} ข้อ · ข้อละ {q.timeLimit} วินาที</small></h1>
    {q.phase === 'lobby' && <div className="card control">
      <p>ให้ผู้เรียนสแกน QR เข้าร่วม แล้วเปิดจอ Live ขึ้นโปรเจกเตอร์</p>
      <button type="button" className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: 'quiz-open' })}><Play size={22} /> เปิดข้อที่ 1</button>
    </div>}
    {q.phase === 'question' && q.question && <div className="card control">
      <div className="quiz-head"><span>ข้อ {q.index + 1} / {q.total}</span><Countdown closesAt={q.closesAt} openedAt={q.openedAt} now={now} /></div>
      <p className="context">{q.question.context}</p>
      <p className="admin-quote">“{q.question.line}”</p>
      <p className="big-stat"><b>{q.answered}</b> คนตอบแล้ว</p>
      <button type="button" className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: 'quiz-reveal' })}>เฉลยเลย</button>
      <p className="muted small">ระบบเฉลยให้อัตโนมัติเมื่อหมดเวลา (เปิดหน้านี้ค้างไว้)</p>
    </div>}
    {q.phase === 'reveal' && q.reveal && <div className="card control">
      <div className="quiz-head"><span>เฉลยข้อ {q.index + 1} / {q.total}</span><span>{q.reveal.answered} คนตอบ</span></div>
      <div className="reveal-answer"><StageBadge k={q.reveal.answer} size="lg" /><div><b>{stageOf(q.reveal.answer).name}</b><span>{q.reveal.why}</span></div></div>
      <Distribution q={q} />
      <button type="button" className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: last ? 'quiz-final' : 'quiz-open' })}>
        {last ? <><Trophy size={22} /> ดูผล 3 อันดับแรก</> : <>ข้อถัดไป ({q.index + 2}/{q.total}) <ArrowRight size={22} /></>}</button>
    </div>}
    {q.phase === 'final' && <div className="card control">
      <Podium board={q.board} />
      <ol className="board">{q.board.slice(3).map((p, i) => <li key={p.pid}><span>#{i + 4}</span><b>{p.name}</b><span>{p.score.toLocaleString()}</span></li>)}</ol>
      <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => act({ action: 'clear' })}>จบเกม กลับหน้าเลือกกิจกรรม</button>
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
    <b>{s.key}{s.key === r.answer ? ' ✓' : ''}</b>
  </div>)}</div>;
}

function FeedbackControl({ f, people, now: serverNow, act, busy }: { f: FeedbackView; people: number; now: number; act: Act; busy: boolean }) {
  const now = useClock(serverNow, 1000);
  return <>
    <h1 className="admin-title">🎤 Feedback คู่หน้าห้อง</h1>
    <div className="card control">
      <p className="pair-line"><b>🧑‍💼 {f.advisor}</b> (ตัวแทน){f.customer && <> × <b>🙋 {f.customer}</b></>}{f.scenarioTitle && <> · ลูกค้า{f.scenarioTitle}</>}</p>
      {f.phase === 'roleplay' && <>
        <p className="big-stat"><b>{mmss(now - f.startedAt)}</b> กำลัง Role Play</p>
        <button type="button" className="btn btn-finish btn-xl" disabled={busy} onClick={() => act({ action: 'feedback-end' })}><Flag size={22} /> จบ Role Play · เปิดรับ Feedback</button>
      </>}
      {f.phase === 'voting' && <>
        <p className="big-stat"><b>{f.ballots}</b> / {people} คนส่ง Feedback แล้ว</p>
        <button type="button" className="btn btn-primary btn-xl" disabled={busy} onClick={() => act({ action: 'feedback-close' })}>ปิดรับ · แสดงผลบนจอ Live</button>
      </>}
      {f.phase === 'results' && f.summary && <>
        <div className="avg avg-inline"><b>{f.summary.overall ?? '–'}</b><span>/ 5 · จาก {f.summary.count} คน</span></div>
        <Bars values={f.summary.criteria} />
        <div className="sticky-actions">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act({ action: 'feedback-reopen' })}>เปิดรับต่อ</button>
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => act({ action: 'clear' })}>คู่ถัดไป <ArrowRight size={20} /></button>
        </div>
      </>}
    </div>
  </>;
}
