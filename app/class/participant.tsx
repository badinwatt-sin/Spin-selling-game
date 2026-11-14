'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, LogOut } from 'lucide-react';
import { api, ApiError, errorText, mmss, useClock, useStored } from '@/lib/client';
import { improveTags, showtimeCriteria, stages, strengthTags, type StageKey } from '@/lib/spin';
import { postit } from '@/lib/content';
import { Bars, Brand, Chips, Confetti, Notice, ScorePicker, SoundToggle, StageBadge, useSfx } from '@/components/ui';
import { play, unlock } from '@/lib/sound';
import { activityName, ChoiceLegend, classUrl, Countdown, Podium, ShowtimeTable, stageOf, useClass, useRoom, useRooms, type FeedbackView, type PostitView, type QuizView } from './shared';
import { postitLeft } from '@/lib/timer';
import { roomName } from '@/lib/rooms';
import { Ico, Shape, Sticker } from '@/components/icons';

type Me = { token: string; pid: string; name: string; classId: string };
type Picked = { activityId: string; index: number; choice: StageKey; ms?: number };

export default function Participant() {
  const r = useRoom();
  if (!r) return <main className="page"><div className="loading">กำลังโหลด…</div></main>;
  if (!r.explicit) return <RoomPicker />;
  return <ParticipantRoom room={r.n} />;
}

// Opened /class without a room (typed the short link): pick the room, or go straight in when only one is running.
function RoomPicker() {
  const { data } = useRooms(4000);
  const live = data?.rooms.filter(x => x.activity || x.people) ?? [];
  useEffect(() => {
    if (data && live.length <= 1) location.replace(`/class?room=${live[0]?.room ?? 1}`);
  }, [data, live.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data || live.length <= 1) return <main className="page"><div className="loading">กำลังเข้าห้องเรียน…</div></main>;
  return <main className="page class-page">
    <header className="topbar"><Brand small /></header>
    <section className="narrow">
      <div className="card join-card">
        <span className="eyebrow">มีหลายห้องเรียนเปิดอยู่</span>
        <h1>เลือกห้องของคุณ</h1>
        <p className="muted">ดูเลขห้องจากจอหน้าห้อง หรือสแกน QR บนจอ</p>
        <div className="room-pick">{live.map(x => <a key={x.room} className="room-pick-item" href={`/class?room=${x.room}`}>
          <b>{roomName(x.room, x.label)}</b>
          <span>{activityName(x.activity) ?? 'รอเริ่มกิจกรรม'} · {x.people} คน</span>
          <ArrowRight size={20} />
        </a>)}</div>
      </div>
    </section>
  </main>;
}

function ParticipantRoom({ room }: { room: number }) {
  // Room 1 keeps the original key so people already in class stay signed in.
  const [me, setMe, loaded] = useStored<Me>(room === 1 ? 'spin-class-me' : `spin-class-me-${room}`);
  const { data, error: pollError } = useClass('player', room, 1500);
  const [error, setError] = useState<string>();
  const stale = Boolean(me && data && me.classId !== data.id);

  if (!loaded) return <main className="page"><div className="loading">กำลังโหลด…</div></main>;
  if (!me || stale) return <Join room={room} label={data?.label ?? null} onJoined={setMe} defaultName={me?.name} restarted={stale} />;
  const a = data?.activity;

  const onAuth = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { setMe({ ...me, classId: '' }); }
    setError(errorText(e));
  };

  return <main className={`page class-page ${a?.kind === 'quiz' ? 'quiz-mode' : ''}`}>
    <header className="topbar">
      <Brand small />
      <div className="topbar-right">
        <span className="room-pill" title={roomName(room, data?.label)}>ห้อง {room}</span>
        <span className="name-pill"><Ico name="advisor" /> {me.name}</span>
        <SoundToggle />
        <button type="button" className="icon-btn" aria-label="เปลี่ยนชื่อ" onClick={() => confirm('ออกและเปลี่ยนชื่อ? คะแนนในเกมนี้จะเริ่มใหม่') && setMe(null)}><LogOut size={18} /></button>
      </div>
    </header>
    <Notice error={error ?? (pollError ? 'สัญญาณขาดหาย กำลังเชื่อมต่อใหม่…' : undefined)} onClose={() => setError(undefined)} />
    {!data ? <div className="loading">กำลังเชื่อมต่อห้องเรียน…</div>
      : !a ? <Waiting room={room} boards={data.boards} />
      : a.kind === 'quiz' ? <Quiz room={room} q={a} me={me} now={data.now} onError={onAuth} />
      : a.kind === 'postit' ? <Postit key={a.id} room={room} boards={data.boards} p={a} me={me} now={data.now} onError={onAuth} />
      : a.kind === 'recap' ? <section className="narrow"><div className="role-hero role-hero-live"><span>SHOW TIME</span><h1>สรุปทุกคู่</h1></div><div className="card"><ShowtimeTable rows={data.showtime} /></div></section>
      : <Feedback key={a.id} room={room} f={a} me={me} onError={onAuth} />}
  </main>;
}

function Join({ room, label, onJoined, defaultName, restarted }: { room: number; label: string | null; onJoined: (m: Me) => void; defaultName?: string; restarted?: boolean }) {
  const [name, setName] = useState(defaultName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => { if (!defaultName) try { const n = localStorage.getItem('spin-name'); if (n) setName(n); } catch { /* ignore */ } }, [defaultName]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(undefined);
    try {
      unlock();
      const res = await api<{ token: string; pid: string; name: string; classId: string }>(classUrl(room), { action: 'join', name });
      try { localStorage.setItem('spin-name', res.name); } catch { /* ignore */ }
      onJoined(res);
    } catch (err) { setError(errorText(err)); setBusy(false); }
  }
  return <main className="page class-page">
    <header className="topbar"><Brand small /></header>
    <form className="card join-card" onSubmit={submit}>
      <span className="eyebrow">กิจกรรมทั้งคลาส · {roomName(room, label)}</span>
      <h1>เข้าร่วมกิจกรรม</h1>
      {restarted && <p className="notice-soft">ผู้สอนเริ่มคลาสใหม่แล้ว กรุณายืนยันชื่ออีกครั้ง</p>}
      <Notice error={error} />
      <label className="field">ชื่อที่จะแสดงบนจอ
        <input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="เช่น ต้น ทีม A" required autoComplete="nickname" autoFocus />
      </label>
      <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'กำลังเข้าร่วม…' : 'เข้าร่วม'} <ArrowRight size={20} /></button>
    </form>
  </main>;
}

function NotebookLink({ room, boards }: { room: number; boards: number }) {
  if (!boards) return null;
  return <a className="btn btn-ghost btn-block notebook-link" href={`/class/board?room=${room}`}><BookOpen size={18} /> สมุด Post-it ของคลาส ({boards} กระดาน) · อ่านซ้ำ / บันทึก</a>;
}

function Waiting({ room, boards }: { room: number; boards: number }) {
  return <section className="narrow">
    <div className="card wait-card">
      <span className="eyebrow">เข้าร่วมแล้ว ✓</span>
      <h2>รอผู้สอนเริ่มกิจกรรม…</h2>
      <div className="pulse-dot" />
      <p className="muted">ทบทวน SPIN ระหว่างรอ</p>
    </div>
    <NotebookLink room={room} boards={boards} />
    <ChoiceLegend />
  </section>;
}

const waitLines = ['คิดแบบที่ปรึกษามืออาชีพ', 'ล็อกคำตอบแล้ว รอเพื่อนแป๊บ', 'ส่งแล้ว ลุ้นเฉลยกัน', 'ตัดสินใจไวมาก', 'มั่นใจไหม เดี๋ยวรู้กัน'];

function Quiz({ room, q, me, now: serverNow, onError }: { room: number; q: QuizView; me: Me; now: number; onError: (e: unknown) => void }) {
  const now = useClock(serverNow, 100);
  const [picked, setPicked, pickedLoaded] = useStored<Picked>('spin-class-pick');
  const mine = picked && picked.activityId === q.id && picked.index === q.index ? picked : null;
  const my = q.scores[me.pid];
  const intro = q.phase === 'question' && q.openedAt !== null && now < q.openedAt;
  const correct = q.phase === 'reveal' && q.reveal && mine ? mine.choice === q.reveal.answer : null;
  useSfx(correct ? 'correct' : 'wrong', q.phase === 'reveal' && mine ? `${q.id}:${q.index}` : null);
  useSfx('whoosh', intro ? `${q.id}:${q.index}` : null);

  async function answer(choice: StageKey) {
    if (mine) return;
    unlock(); play('tap');
    const p: Picked = { activityId: q.id, index: q.index, choice };
    setPicked(p); navigator.vibrate?.(30);
    try { const r = await api<{ ms: number }>(classUrl(room), { action: 'answer', activityId: q.id, index: q.index, choice }, me.token); setPicked({ ...p, ms: r.ms }); }
    catch (e) { setPicked(null); onError(e); }
  }

  if (q.phase === 'lobby') return <section className="qp qp-lobby">
    <div className="qp-center">
      <span className="qp-kicker">เกมทาย SPIN</span>
      <h1>คุณเข้าเกมแล้ว!</h1>
      <p className="qp-name">{me.name}</p>
      <p>ดูชื่อคุณบนจอหน้าห้อง · {q.total} ข้อ · ข้อละ {q.timeLimit} วินาที · สูงสุด {q.maxPoints.toLocaleString()} คะแนน/ข้อ</p>
      <p className="qp-small">{q.speedBonus ? 'ตอบถูก + เร็ว = คะแนนมาก' : 'ตอบถูกได้คะแนนเต็ม ไม่ต้องรีบ'}</p>
    </div>
    <ChoiceLegend compact />
  </section>;

  if (q.phase === 'question' && q.question) {
    if (intro) {
      const n = Math.max(1, Math.ceil(((q.openedAt ?? 0) - now) / 1000));
      return <section className="qp qp-intro" key={`i${q.index}`}>
        <span className="qp-kicker">ข้อ {q.index + 1} / {q.total}</span>
        <p className="qp-question">“{q.question.line}”</p>
        <div className="qp-count" key={n}>{n}</div>
        <p className="qp-small">อ่านประโยคให้จบ แล้วเตรียมเลือก S · P · I · N</p>
      </section>;
    }
    const closed = now > (q.closesAt ?? 0);
    if (mine || closed) return <section className="qp qp-wait">
      {mine ? <>
        <div className="qp-picked" style={{ '--c': stageOf(mine.choice).color } as React.CSSProperties}>{mine.choice}</div>
        <h2>{waitLines[(q.index + me.name.length) % waitLines.length]}</h2>
        {mine.ms !== undefined && <p>ตอบใน {(mine.ms / 1000).toFixed(1)} วินาที</p>}
      </> : <h2>⏰ หมดเวลา!</h2>}
      <div className="qp-dots"><i /><i /><i /></div>
    </section>;
    return <section className="qp qp-answer">
      <div className="qp-top"><span>ข้อ {q.index + 1}/{q.total}</span><Countdown closesAt={q.closesAt} openedAt={q.openedAt} now={now} /></div>
      <p className="qp-question qp-question-small">“{q.question.line}”</p>
      {pickedLoaded && <div className="qp-tiles">{stages.map(s => <button type="button" key={s.key} className="qp-tile" style={{ '--c': s.color } as React.CSSProperties} onClick={() => answer(s.key)}>
        <Shape k={s.key} size={40} /><b>{s.key}</b><span>{s.name.replace(' Question', '')}</span><small>{s.thai}</small>
      </button>)}</div>}
    </section>;
  }

  if (q.phase === 'reveal' && q.reveal) {
    const right = stageOf(q.reveal.answer);
    const scores = Object.values(q.scores).sort((x, y) => y.score - x.score);
    const ahead = my ? scores.filter(x => x.score > my.score).at(-1) : undefined;
    return <section className={`qp qp-result ${!mine ? 'none' : correct ? 'yes' : 'no'}`}>
      <div className="qp-center">
        <div className="qp-mark">{!mine ? '⏰' : correct ? '✓' : '✗'}</div>
        <h1>{!mine ? 'ข้อนี้ไม่ได้ตอบ' : correct ? 'ถูกต้อง!' : 'ยังไม่ถูก'}</h1>
        {correct && <p className="qp-points">+{my?.last ?? 0}</p>}
        {correct && (my?.streak ?? 0) >= 2 && <p className="qp-streak">🔥 ถูกติดกัน {my!.streak} ข้อ</p>}
        {mine && !correct && <p className="pick-vs">คุณตอบ <b>{mine.choice}</b> → เฉลย <b>{right.key}</b> {right.name}</p>}
      </div>
      <div className="qp-why"><b>{right.key} · {right.name}</b><span>{q.reveal.why}</span></div>
      {my && <div className="qp-rank">
        <span>อันดับ <b>{1 + scores.filter(x => x.score > my.score).length}</b> จาก {q.players}</span>
        <span>{my.score.toLocaleString()} คะแนน</span>
        {ahead && <small>ตามหลัง {ahead.name} อีก {(ahead.score - my.score).toLocaleString()} คะแนน</small>}
      </div>}
    </section>;
  }

  const rank = my ? 1 + Object.values(q.scores).filter(x => x.score > my.score).length : 0;
  return <section className="qp qp-final">
    <Confetti fire={rank > 0 && rank <= 3 && (my?.score ?? 0) > 0 ? q.id : null} />
    <div className="qp-center">
      <span className="qp-kicker">จบเกม</span>
      {my ? <>
        <div className="qp-medal">{my.score > 0 && rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : <Sticker name="trophy" tone="yellow" size={40} />}</div>
        <h1>อันดับ {rank}</h1>
        <p className="qp-points">{my.score.toLocaleString()} คะแนน</p>
        <p>ตอบถูก {my.correct} จาก {q.total} ข้อ</p>
      </> : <h1>ขอบคุณที่ร่วมเล่น!</h1>}
    </div>
    <Podium board={q.board} />
  </section>;
}

function Feedback({ room, f, me, onError }: { room: number; f: FeedbackView; me: Me; onError: (e: unknown) => void }) {
  const [scores, setScores] = useState<number[]>(showtimeCriteria.map(() => 0));
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improves, setImproves] = useState<string[]>([]);
  const [good, setGood] = useState('');
  const [tip, setTip] = useState('');
  const [sentFor, setSentFor] = useStored<string>('spin-class-ballot');
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const sent = sentFor === f.id;

  async function submit() {
    setBusy(true);
    try { await api(classUrl(room), { action: 'ballot', activityId: f.id, scores, strengths, improves, good, tip }, me.token); setSentFor(f.id); }
    catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  const who = <p className="pair-line"><b><Ico name="advisor" /> {f.advisor}</b> (ตัวแทน){f.customer && <> คุยกับ <b><Ico name="customer" /> {f.customer}</b></>}{f.scenarioTitle && <> · ลูกค้า{f.scenarioTitle}</>}</p>;

  if (f.phase === 'roleplay') return <section className="narrow">
    <div className="role-hero role-hero-live"><span>● กำลัง Role Play หน้าห้อง</span><h1>ตั้งใจฟัง แล้วเตรียมให้ Feedback</h1>{who}</div>
    <div className="card"><span className="eyebrow">สังเกตตัวแทน 5 ด้าน</span>
      <ol className="watch-list">{stages.map(s => <li key={s.key}><StageBadge k={s.key} size="sm" /> <b>{s.name}</b> — {s.meaning}</li>)}
        <li><span className="score-key">♥</span> <b>Listening</b> — ฟัง ทวนสรุป และไม่รีบขาย</li>
        <li><span className="score-key">★</span> <b>Present Solution</b> — นำเสนอทางออกที่ตรงกับความต้องการของลูกค้า</li></ol></div>
    <div className="card wait-card"><div className="pulse-dot" /> เมื่อผู้สอนกด “จบ Role Play” ฟอร์มจะเปิดให้กรอก</div>
  </section>;

  if (f.phase === 'results') return <section className="narrow">
    <div className="role-hero role-hero-live"><span>ผลจากทั้งห้อง</span><h1>{f.advisor}</h1>{who}</div>
    {f.summary && <div className="card"><div className="avg avg-inline"><b>{f.summary.overall ?? '–'}</b><span>/ 5 · จาก {f.summary.count} คน</span></div><Bars values={f.summary.criteria} list={showtimeCriteria} /></div>}
    <p className="muted center">ดูสรุปเต็มบนจอหน้าห้อง</p>
  </section>;

  if (sent) return <section className="narrow">
    <div className="card wait-card"><span className="eyebrow">ส่ง Feedback แล้ว <Check size={16} /></span><h2>ขอบคุณ!</h2><p className="muted">รอผู้สอนสรุปผลบนจอ</p>
      <button type="button" className="btn btn-ghost" onClick={() => setSentFor(null)}>แก้ไขคำตอบ</button></div>
  </section>;

  const done = scores.filter(x => x > 0).length;
  const total = showtimeCriteria.length;
  function trySubmit() {
    if (done < total) { setNudge(true); document.querySelectorAll('.score-row')[scores.findIndex(x => !x)]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    void submit();
  }
  return <section className="narrow with-dock">
    <div className="role-hero role-hero-live"><span>ให้ Feedback ตัวแทน</span><h1>{f.advisor} ใช้ SPIN ได้แค่ไหน?</h1>{who}</div>
    <div className="card">
      <ScorePicker value={scores} onChange={setScores} list={showtimeCriteria} highlightMissing={nudge} />
      <details className="disclosure" open={strengths.length + improves.length > 0 || Boolean(good || tip)}>
        <summary>เพิ่มความเห็น (ไม่บังคับ)</summary>
        <div className="field"><span><Ico name="strength" /> จุดเด่น (เลือกได้สูงสุด 4)</span><Chips options={strengthTags} value={strengths} onChange={setStrengths} tone="good" /></div>
        <div className="field"><span><Ico name="grow" /> ควรพัฒนา (เลือกได้สูงสุด 4)</span><Chips options={improveTags} value={improves} onChange={setImproves} tone="warn" /></div>
        <label className="field">ชอบตรงไหนเป็นพิเศษ<textarea rows={2} maxLength={240} value={good} onChange={e => setGood(e.target.value)} placeholder="เช่น คำถามเรื่องค่าเทอมลูกทำให้ลูกค้าคิดตาม" /></label>
        <label className="field">คำแนะนำ<textarea rows={2} maxLength={240} value={tip} onChange={e => setTip(e.target.value)} placeholder="เช่น ลองให้ลูกค้าพูดประโยชน์เองใน N" /></label>
      </details>
      <p className="muted small center"><Ico name="lock" /> ไม่แสดงชื่อผู้ให้ Feedback บนจอ</p>
    </div>
    <div className="dock">
      <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={trySubmit}>{done < total ? `ให้คะแนนแล้ว ${done}/${total}` : 'ส่ง Feedback'} <ArrowRight size={20} /></button>
    </div>
  </section>;
}

function Postit({ room, boards, p, me, now: serverNow, onError }: { room: number; boards: number; p: PostitView; me: Me; now: number; onError: (e: unknown) => void }) {
  const now = useClock(serverNow, 500);
  const [text, setText] = useState('');
  const [sent, setSent] = useStored<{ id: string; text: string }>('spin-class-note');
  const [busy, setBusy] = useState(false);
  const s = stageOf(p.stage);
  const mine = sent?.id === p.id ? sent.text : null;
  const left = postitLeft(p, now);
  const paused = Boolean(p.pausedAt);
  async function submit() {
    setBusy(true);
    try { await api(classUrl(room), { action: 'note', activityId: p.id, text }, me.token); setSent({ id: p.id, text: text.trim() }); }
    catch (e) { onError(e); }
    finally { setBusy(false); }
  }
  const head = <div className="role-hero postit-hero" style={{ '--c': s.color } as React.CSSProperties}>
    <span>#กิจกรรม Post-it · {s.name}</span>
    <h1>{postit[p.stage].prompt}</h1>
    {p.scenarioTitle && <p>ลูกค้า: <b>{p.scenarioTitle}</b> — {p.scenarioBrief}</p>}
  </div>;
  if (p.phase === 'wall') return <section className="narrow">
    {head}
    <div className="card wait-card"><span className="eyebrow">ดูกระดาน Post-it บนจอหน้าห้อง</span>{mine && <p className="note note-mine">“{mine}”</p>}</div>
    <NotebookLink room={room} boards={boards} />
  </section>;
  return <section className="narrow">
    {head}
    <div className="quiz-head"><span>เหลือเวลา</span><b className={`postit-timer ${paused ? 'paused' : left < 30_000 ? 'low' : ''}`}>{paused ? (left > 0 ? `⏸ ${mmss(left)}` : '⏸ ยังส่งได้') : left > 0 ? mmss(left) : 'หมดเวลา'}</b></div>
    {paused && <p className="notice-soft paused-note">⏸ ผู้สอนหยุดเวลาไว้ — ยังส่งหรือแก้ Post-it ได้</p>}
    <div className="card">
      <div className="stage-hint" style={{ '--c': s.color } as React.CSSProperties}><StageBadge k={s.key} /><div><b>{s.meaning}</b><span>{s.goal}</span></div></div>
      {mine && <p className="note note-mine">ส่งแล้ว: “{mine}”</p>}
      <label className="field">{mine ? 'แก้ไขคำถามของคุณ' : 'คำถามของคุณ (1 คำถาม)'}
        <textarea className="postit-input" rows={4} maxLength={200} value={text} onChange={e => setText(e.target.value)} placeholder={`“${s.examples[0]}”`} />
      </label>
      <button type="button" className="btn btn-primary btn-lg btn-block" disabled={busy || text.trim().length < 5 || (!paused && left < -5000)} onClick={submit}>{mine ? 'ส่งใหม่แทนอันเดิม' : 'แปะ Post-it'} <ArrowRight size={20} /></button>
      <p className="muted small center">Post-it จะขึ้นจอพร้อมกันเมื่อผู้สอนเปิดกระดาน</p>
    </div>
  </section>;
}
