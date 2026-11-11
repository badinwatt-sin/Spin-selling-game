'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Eye, EyeOff, Flag, LogOut, Printer, RefreshCw, Share2, Shuffle, Users } from 'lucide-react';
import { api, errorText, mmss, useClock, usePoll, useStored, ApiError } from '@/lib/client';
import { criteria, reactionByKey, reactions, stages, type ReactionKey } from '@/lib/spin';
import { Bars, Brand, Notice, Qr, ScorePicker, StageBadge, Wall, useOrigin } from '@/components/ui';
import { bridges, presentSolution, readySignals, sTopics } from '@/lib/content';
import { play, unlock } from '@/lib/sound';

type Report = { round: number; advisor: string; customer: string; scenario: string; scores: number[]; comment: string; reactions: Partial<Record<ReactionKey, number>>; stageReached: number; seconds: number; createdAt: number; wall?: number };
type Game = {
  revision: number; code: string; now: number; me: number; role: 'advisor' | 'customer';
  players: { name: string }[]; round: number; phase: 'lobby' | 'play' | 'feedback' | 'report';
  stage: number; maxStage: number; ready: boolean; startedAt: number | null; ends: number | null; duration: number;
  scenario: { id: number; title: string; en: string; brief: string };
  lines?: string[][];
  objections?: { line: string; stage: 'S' | 'P' | 'I' | 'N'; response: string }[];
  presentAngle?: string;
  persona?: { facts: string[]; attitude: string; objection: string; play: string[]; hiddenNeed?: string; wallOpens?: string[]; wallCloses?: string[]; objections?: string[] };
  wall: number;
  reactions: { k: ReactionKey; at: number; stage: number }[];
  reports: Report[];
};
type Session = { code: string; token: string };
const scenarioNames = ['แม่บ้าน', 'ข้าราชการ', 'พ่อค้า แม่ค้า', 'พนักงานบริษัทเอกชน', 'แพทย์ พยาบาล', 'นักธุรกิจ'];

export default function PairGame() {
  const [session, setSession, loaded] = useStored<Session>('spin-pair');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const fast = useRef(false);
  const { data: game, setData, error: pollError } = usePoll<Game>(
    session ? () => api<Game>(`/api/game?code=${session.code}`, undefined, session.token) : null,
    fast.current ? 1200 : 2200,
  );
  fast.current = game?.phase === 'play' || game?.phase === 'lobby';

  useEffect(() => {
    if (pollError instanceof ApiError && [401, 404, 410].includes(pollError.status)) {
      setError(pollError.message); setSession(null); setData(undefined);
    }
  }, [pollError, setSession, setData]);

  async function act(body: Record<string, unknown>) {
    if (!session) return;
    setBusy(true); setError(undefined);
    try { setData(await api<Game>('/api/game', { ...body, code: session.code }, session.token)); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  function leave() {
    if (confirm('ออกจากห้องนี้? (ถ้าต้องการกลับมา ใช้รหัสห้องเดิมได้ภายใน 4 ชั่วโมง)')) { setSession(null); setData(undefined); }
  }

  if (!loaded) return <main className="page"><div className="loading">กำลังโหลด…</div></main>;
  if (!session) return <Entry onReady={s => { setSession(s); setError(undefined); }} error={error} />;
  if (!game) return <main className="page"><Header onLeave={leave} />
    <div className="loading">{pollError ? errorText(pollError) : 'กำลังเชื่อมต่อห้อง…'}</div></main>;

  const props = { game, act, busy, session };
  return <main className={`page pair pair-${game.role} phase-${game.phase}`}>
    <Header game={game} onLeave={leave} />
    <Notice error={error} onClose={() => setError(undefined)} />
    {game.phase === 'lobby' && <Lobby {...props} />}
    {game.phase === 'play' && (game.role === 'advisor' ? <AdvisorPlay {...props} /> : <CustomerPlay {...props} />)}
    {game.phase === 'feedback' && (game.role === 'customer' ? <CustomerFeedback {...props} /> : <AdvisorWait game={game} />)}
    {game.phase === 'report' && <ReportView {...props} />}
  </main>;
}

type P = { game: Game; act: (b: Record<string, unknown>) => Promise<void>; busy: boolean; session: Session };

function Header({ game, onLeave }: { game?: Game; onLeave: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!game) return;
    const link = `${location.origin}/pair?code=${game.code}`;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { prompt('คัดลอกลิงก์นี้ส่งให้เพื่อน', link); }
  };
  return <header className="topbar">
    <Brand small />
    <div className="topbar-right">
      {game && <>
        <span className={`role-pill role-${game.role}`}>{game.role === 'advisor' ? '🧑‍💼 ตัวแทน' : '🙋 ลูกค้า'}</span>
        <button type="button" className="code-pill" onClick={copy} title="คัดลอกลิงก์ชวนเพื่อน">
          ห้อง <b>{game.code}</b> {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <span className="round-pill">รอบ {game.round}</span>
      </>}
      <button type="button" className="icon-btn" onClick={onLeave} aria-label="ออกจากห้อง"><LogOut size={18} /></button>
    </div>
  </header>;
}

function Entry({ onReady, error: initialError }: { onReady: (s: Session) => void; error?: string }) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'advisor' | 'customer'>('advisor');
  const [scenario, setScenario] = useState<number | 'random'>('random');
  const [duration, setDuration] = useState(600);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  useEffect(() => {
    const c = new URLSearchParams(location.search).get('code');
    if (c) { setCode(c.toUpperCase().slice(0, 6)); setTab('join'); }
    try { const n = localStorage.getItem('spin-name'); if (n) setName(n); } catch { /* ignore */ }
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(undefined);
    try {
      try { localStorage.setItem('spin-name', name.trim()); } catch { /* ignore */ }
      const body = tab === 'create'
        ? { action: 'create', name, role, duration, scenario: scenario === 'random' ? undefined : scenario }
        : { action: 'join', name, code: code.trim().toUpperCase() };
      const res = await api<Game & { token: string }>('/api/game', body);
      onReady({ code: res.code, token: res.token });
    } catch (err) { setError(errorText(err)); setBusy(false); }
  }
  return <main className="page">
    <header className="topbar"><Brand small /><a className="ghost-link" href="/">หน้าแรก</a></header>
    <section className="entry">
      <div className="entry-intro">
        <span className="eyebrow"><Users size={16} /> ฝึกเป็นคู่ · 2 คน</span>
        <h1>Role Play SPIN<br />ตัวแทน × ลูกค้า</h1>
        <p>คนหนึ่งเป็น <b>ตัวแทน</b> ถามตามลำดับ S › P › I › N อีกคนเป็น <b>ลูกค้า</b> ตามการ์ด และกดบอกความรู้สึกได้ระหว่างคุย จบรอบแล้วให้คะแนนกัน แล้ว<b>สลับบทบาท</b></p>
        <ol className="how">
          <li><b>1</b> สร้างห้อง แล้วส่งรหัสให้คู่ของคุณ</li>
          <li><b>2</b> ลูกค้าอ่านการ์ด ตัวแทนดูตัวอย่างประโยค</li>
          <li><b>3</b> คุยจริง ลูกค้ากดอีโมจิบอกความรู้สึก</li>
          <li><b>4</b> ลูกค้าให้คะแนน แล้วสลับบท</li>
        </ol>
      </div>
      <form className="card entry-card" onSubmit={submit}>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'create'} className={tab === 'create' ? 'on' : ''} onClick={() => setTab('create')}>สร้างห้องใหม่</button>
          <button type="button" role="tab" aria-selected={tab === 'join'} className={tab === 'join' ? 'on' : ''} onClick={() => setTab('join')}>มีรหัสห้องแล้ว</button>
        </div>
        <Notice error={error} />
        {tab === 'join' && <label className="field">รหัสห้อง 6 ตัว
          <input className="code-input" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC234" autoCapitalize="characters" autoComplete="off" inputMode="text" required minLength={6} />
        </label>}
        <label className="field">ชื่อเล่นของคุณ
          <input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder="เช่น ต้น" required autoComplete="nickname" />
        </label>
        {tab === 'create' && <>
          <div className="field">รอบแรกคุณเป็น
            <div className="segmented">
              <button type="button" className={role === 'advisor' ? 'on' : ''} onClick={() => setRole('advisor')}>🧑‍💼 ตัวแทน</button>
              <button type="button" className={role === 'customer' ? 'on' : ''} onClick={() => setRole('customer')}>🙋 ลูกค้า</button>
            </div>
          </div>
          <label className="field">การ์ดลูกค้า
            <select value={scenario} onChange={e => setScenario(e.target.value === 'random' ? 'random' : Number(e.target.value))}>
              <option value="random">🎲 สุ่มการ์ด</option>
              {scenarioNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </label>
          <div className="field">เวลาต่อรอบ
            <div className="segmented">
              {[300, 600, 900, 1200].map(d => <button type="button" key={d} className={duration === d ? 'on' : ''} onClick={() => setDuration(d)}>{d / 60} นาที</button>)}
            </div>
          </div>
        </>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'กำลังเชื่อมต่อ…' : tab === 'create' ? 'สร้างห้อง' : 'เข้าห้อง'} <ArrowRight size={20} /></button>
      </form>
    </section>
  </main>;
}

function CardImage({ session, game }: { session: Session; game: Game }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let url = ''; let alive = true;
    fetch(`/api/card?code=${session.code}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: 'no-store' })
      .then(r => r.ok ? r.blob() : null).then(b => { if (b && alive) { url = URL.createObjectURL(b); setSrc(url); } });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [session.code, session.token, game.scenario.id, game.round]);
  return src ? <img className="card-image" src={src} alt={`การ์ดลูกค้า: ${game.scenario.title}`} /> : <div className="card-image card-image-loading">กำลังโหลดการ์ด…</div>;
}

function ShareRoom({ game }: { game: Game }) {
  const origin = useOrigin();
  const link = `${origin}/pair?code=${game.code}`;
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: 'SPIN Role Play', text: `มาฝึก SPIN ด้วยกัน รหัสห้อง ${game.code}`, url: link });
      else { await navigator.clipboard.writeText(link); alert('คัดลอกลิงก์แล้ว'); }
    } catch { /* cancelled */ }
  }
  return <section className="center-stack">
    <div className="card wait-card">
      <span className="eyebrow">รอคู่ของคุณ</span>
      <h2>ให้เพื่อนสแกน QR นี้</h2>
      {origin && <Qr url={link} size={200} />}
      <p className="muted">หรือเปิดเว็บนี้ แล้วใส่รหัสห้อง</p>
      <div className="big-code">{game.code}</div>
      <button type="button" className="btn btn-primary btn-lg" onClick={share}><Share2 size={20} /> แชร์ลิงก์ให้เพื่อน</button>
      <div className="pulse-dot">กำลังรอเพื่อนเข้าห้อง…</div>
    </div>
  </section>;
}

function CustomerBrief({ game, session }: { game: Game; session: Session }) {
  const p = game.persona!;
  const [showCard, setShowCard] = useState(false);
  return <div className="stack">
    <div className="card persona">
      <span className="eyebrow">บทของคุณ</span>
      <h2 className="persona-title">{game.scenario.title}</h2>
      <ul className="facts">{p.facts.map(f => <li key={f}>{f}</li>)}</ul>
      <p className="objection">ประโยคติดปาก: {p.objection}</p>
      {p.hiddenNeed && <p className="hidden-need">🔒 <b>ในใจลึกๆ (บอกเมื่อถูกถามดีๆ เท่านั้น):</b> {p.hiddenNeed}</p>}
      <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowCard(v => !v)}>{showCard ? <><EyeOff size={18} /> ซ่อนการ์ดต้นฉบับ</> : <><Eye size={18} /> ดูการ์ดต้นฉบับ</>}</button>
      {showCard && <CardImage session={session} game={game} />}
    </div>
    {(p.wallOpens?.length || p.wallCloses?.length) ? <div className="card wall-guide">
      <span className="eyebrow">กำแพงของคุณ</span>
      <div className="two-col">
        <div><b className="good-text">⬇ ลดลงเมื่อตัวแทน…</b><ul>{p.wallOpens?.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><b className="warn-text">⬆ สูงขึ้นเมื่อตัวแทน…</b><ul>{p.wallCloses?.map(x => <li key={x}>{x}</li>)}</ul></div>
      </div>
    </div> : null}
    <details className="card">
      <summary className="summary-line">วิธีตอบในแต่ละขั้น</summary>
      <ol className="play-guide">{stages.map((s, i) => <li key={s.key}><StageBadge k={s.key} size="sm" /> <span>{p.play[i]}</span></li>)}</ol>
      {p.objections && p.objections.length > 0 && <><b>ข้อโต้แย้งที่ใช้ได้</b><ul className="facts">{p.objections.map(o => <li key={o}>“{o}”</li>)}</ul></>}
    </details>
  </div>;
}

function Lobby({ game, act, busy, session }: P) {
  const partner = game.players[1 - game.me];
  const advisorName = game.players[game.role === 'advisor' ? game.me : 1 - game.me]?.name;
  const wasReady = useRef(game.ready);
  useEffect(() => { if (game.ready && !wasReady.current) navigator.vibrate?.([60, 40, 60]); wasReady.current = game.ready; }, [game.ready]);
  if (!partner) return <ShareRoom game={game} />;

  if (game.role === 'customer') return <section className="narrow with-dock">
    <div className="role-hero role-hero-customer">
      <span>รอบที่ {game.round}</span>
      <h1>คุณรับบท “ลูกค้า”</h1>
      <p>อ่านบทให้เข้าใจ {advisorName} จะเป็นตัวแทนมาคุยกับคุณ ระหว่างคุยกดอีโมจิบอกความรู้สึกได้ตลอด</p>
    </div>
    <CustomerBrief game={game} session={session} />
    <div className="dock">
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act({ action: 'shuffle' })} aria-label="เปลี่ยนการ์ด"><Shuffle size={18} /></button>
      {game.ready
        ? <button type="button" className="btn btn-done btn-lg" disabled={busy} onClick={() => act({ action: 'ready', ready: false })}><Check size={20} /> พร้อมแล้ว · รอตัวแทนเริ่ม</button>
        : <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => act({ action: 'ready' })}>อ่านบทแล้ว พร้อมเล่น <ArrowRight size={20} /></button>}
    </div>
  </section>;

  return <section className="narrow with-dock">
    <div className="role-hero role-hero-advisor">
      <span>รอบที่ {game.round}</span>
      <h1>คุณรับบท “ตัวแทน”</h1>
      <p>ลูกค้าวันนี้: <b>{game.scenario.title}</b> — {game.scenario.brief} ({partner.name} รับบท)</p>
    </div>
    <div className="card">
      <span className="eyebrow">เป้าหมาย: ลดกำแพงลูกค้าด้วยคำถาม ไม่ใช่การขาย</span>
      <div className="plan">{stages.map(s => <div key={s.key} className="plan-item" style={{ '--c': s.color } as React.CSSProperties}>
        <StageBadge k={s.key} /><div><b>{s.thai}</b><span>{s.meaning}</span></div></div>)}</div>
      <p className="muted small">ระหว่างคุยมีตัวอย่างประโยคสำหรับลูกค้ารายนี้ทุกขั้น และเลื่อนไป-กลับได้ตลอด</p>
    </div>
    <div className="card">
      <span className="eyebrow">เวลาต่อรอบ</span>
      <div className="segmented">
        {[300, 600, 900, 1200].map(d => <button type="button" key={d} className={game.duration === d ? 'on' : ''} disabled={busy} onClick={() => act({ action: 'duration', duration: d })}>{d / 60} นาที</button>)}
      </div>
    </div>
    <div className="dock">
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act({ action: 'shuffle' })} aria-label="สุ่มลูกค้าใหม่"><Shuffle size={18} /></button>
      <button type="button" className="btn btn-primary btn-lg" disabled={busy || !game.ready} onClick={() => { unlock(); play('whoosh'); void act({ action: 'start' }); }}>
        {game.ready ? <>เริ่ม Role Play <ArrowRight size={20} /></> : <><span className="pulse-dot" /> รอ {partner.name} อ่านบท…</>}</button>
    </div>
  </section>;
}

function useTimeLeft(game: Game) {
  const now = useClock(game.now);
  return (game.ends ?? now) - now;
}
function TimeText({ left }: { left: number }) {
  return <span className={`timer ${left < 0 ? 'timer-over' : left < 60_000 ? 'timer-low' : ''}`} role="timer">{left < 0 ? `+${mmss(-left)}` : mmss(left)}</span>;
}

function AdvisorPlay({ game, act, busy }: P) {
  const [stage, setStage] = useState(game.stage);
  const [more, setMore] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const pending = useRef(false);
  const left = useTimeLeft(game);
  useEffect(() => { if (!pending.current) setStage(game.stage); }, [game.stage, game.revision]);
  useEffect(() => setMore(false), [stage]);
  const go = async (i: number) => {
    if (i < 0 || i > 3) return;
    setStage(i); pending.current = true; scrollTo({ top: 0, behavior: 'smooth' });
    await act({ action: 'stage', stage: i }); pending.current = false;
  };
  const s = stages[stage];
  const latest = game.reactions.at(-1);
  const [flash, setFlash] = useState<typeof latest>();
  const seen = useRef(latest?.at ?? 0);
  useEffect(() => {
    if (latest && latest.at > seen.current) {
      seen.current = latest.at; setFlash(latest); navigator.vibrate?.(40); play('react');
      const t = setTimeout(() => setFlash(undefined), 5000); return () => clearTimeout(t);
    }
  }, [latest]);
  const lines = game.lines![stage];
  const bridge = bridges.find(b => b.from === s.key);
  const objections = (game.objections ?? []).filter(o => o.stage === s.key);
  const r = flash ? reactionByKey[flash.k] : null;

  return <section className="play with-dock">
    <div className="live-bar">
      <div className="mini-steps" role="tablist" aria-label="ลำดับ SPIN">
        {stages.map((x, i) => <button type="button" role="tab" key={x.key} aria-selected={i === stage} onClick={() => go(i)}
          className={`mini-step ${i === stage ? 'now' : i <= Math.max(game.maxStage, stage) ? 'done' : ''}`} style={{ '--c': x.color } as React.CSSProperties}>
          {x.key}{i < stage && <small>✓</small>}</button>)}
      </div>
      <Wall level={game.wall} compact />
      <TimeText left={left} />
    </div>
    {r && <div className={`live-flash tone-${r.tone}`} role="status" key={flash!.at}><span>{r.emoji}</span><div><b>ลูกค้า: {r.label}</b><small>{r.coach}</small></div></div>}

    <article className="card stage-card" style={{ '--c': s.color } as React.CSSProperties}>
      <header>
        <StageBadge k={s.key} size="lg" />
        <div><h2>{s.thai}</h2><p>{s.name} · {s.meaning}</p></div>
      </header>
      <p className="goal">🎯 {s.goal}</p>
      <span className="eyebrow">ลองถามลูกค้า{game.scenario.title}</span>
      <ul className="lines lines-big">{(more ? lines : lines.slice(0, 2)).map(l => <li key={l}>“{l}”</li>)}</ul>
      {lines.length > 2 && <button type="button" className="link-btn" onClick={() => setMore(v => !v)}>{more ? 'ย่อ' : `ดูอีก ${lines.length - 2} ประโยค`}</button>}

      {s.key === 'S' && sTopics.length > 0 && <details className="disclosure">
        <summary>หัวข้อที่ควรรู้ ({asked.length}/{sTopics.length})</summary>
        <div className="topic-chips">{sTopics.map(t => <button type="button" key={t.label} className={asked.includes(t.label) ? 'on' : ''} aria-pressed={asked.includes(t.label)}
          onClick={() => setAsked(a => a.includes(t.label) ? a.filter(x => x !== t.label) : [...a, t.label])} title={t.question}>{asked.includes(t.label) ? '✓ ' : ''}{t.label}</button>)}</div>
      </details>}
      {objections.length > 0 && <details className="disclosure">
        <summary>ถ้าลูกค้าค้าน ({objections.length})</summary>
        {objections.map(o => <div key={o.line} className="objection-pair"><p className="objection">“{o.line}”</p><p>👉 {o.response}</p></div>)}
      </details>}
      {s.key === 'N' && presentSolution.steps.length > 0 && <details className="disclosure" open>
        <summary>ต่อยอดสู่การนำเสนอ (Present Solution)</summary>
        {presentSolution.bridge[0] && <p className="bridge">“{presentSolution.bridge[0]}”</p>}
        <ol className="steps">{presentSolution.steps.map(x => <li key={x.title}><b>{x.title}</b> — {x.detail}</li>)}</ol>
        {game.presentAngle && <p className="muted small">แนวทางที่น่าจะเหมาะกับลูกค้ารายนี้: {game.presentAngle}</p>}
      </details>}
      <details className="disclosure">
        <summary>เคล็ดลับขั้นนี้</summary>
        <div className="tips">
          <div><b>✅ ทำแบบนี้</b><ul>{s.doThis.map(t => <li key={t}>{t}</li>)}</ul></div>
          <div className="avoid"><b>⚠️ ระวัง</b><p>{s.avoid}</p></div>
        </div>
        {readySignals[s.key].length > 0 && <><b>🚦 พร้อมไปขั้นถัดไปเมื่อ</b><ul>{readySignals[s.key].map(x => <li key={x}>{x}</li>)}</ul></>}
        <b>📘 ตัวอย่างจากบทเรียน</b>
        <ul className="lines">{s.examples.map(l => <li key={l}>“{l}”</li>)}</ul>
      </details>
      {bridge && <p className="bridge">🔗 ประโยคเชื่อมไป {bridge.to}: “{bridge.lines[0]}”</p>}
    </article>

    <div className="dock">
      <button type="button" className="btn btn-ghost btn-lg" disabled={stage === 0} onClick={() => go(stage - 1)} aria-label="ย้อนกลับ"><ArrowLeft size={20} /> {stage > 0 && stages[stage - 1].key}</button>
      {stage < 3
        ? <button type="button" className="btn btn-primary btn-lg" onClick={() => go(stage + 1)}>ถัดไป {stages[stage + 1].key} · {stages[stage + 1].thai} <ArrowRight size={20} /></button>
        : <button type="button" className="btn btn-finish btn-lg" disabled={busy} onClick={() => confirm('จบบทสนทนาและให้ลูกค้าให้คะแนน?') && act({ action: 'finish' })}><Flag size={20} /> จบบทสนทนา</button>}
    </div>
    {stage < 3 && <button type="button" className="link-btn end-early" disabled={busy} onClick={() => confirm('จบบทสนทนาตอนนี้เลย?') && act({ action: 'finish' })}>จบบทสนทนาก่อนครบ 4 ขั้น</button>}
  </section>;
}

function CustomerPlay({ game, act, session }: P) {
  const [sent, setSent] = useState<ReactionKey>();
  const left = useTimeLeft(game);
  const s = stages[game.stage];
  async function send(k: ReactionKey) {
    setSent(k); navigator.vibrate?.(25); unlock(); play('tap');
    setTimeout(() => setSent(x => x === k ? undefined : x), 1500);
    await act({ action: 'react', kind: k });
  }
  const groups: { title: string; tone: 'good' | 'neutral' | 'warn' }[] = [
    { title: '👍 รู้สึกดี', tone: 'good' }, { title: '🤔 ยังลังเล', tone: 'neutral' }, { title: '👎 ไม่โอเค', tone: 'warn' },
  ];
  return <section className="play">
    <div className="live-bar live-bar-customer" style={{ '--c': s.color } as React.CSSProperties}>
      <StageBadge k={s.key} />
      <div className="live-bar-text"><b>ตัวแทนอยู่ขั้น {s.thai}</b><small>{game.persona!.play[game.stage]}</small></div>
      <TimeText left={left} />
    </div>
    <Wall level={game.wall} />
    <div className="react-groups">
      {groups.map(g => <div key={g.tone} className="react-group">
        <span className="react-group-title">{g.title}</span>
        <div className="react-grid">
          {reactions.filter(r => r.tone === g.tone).map(r => <button type="button" key={r.key} className={`react-btn tone-${r.tone} ${sent === r.key ? 'sent' : ''}`} onClick={() => send(r.key)}>
            <span className="react-emoji">{r.emoji}</span><span>{r.label}</span>{sent === r.key && <em>ส่งแล้ว</em>}
          </button>)}
        </div>
      </div>)}
    </div>
    <details className="card"><summary className="summary-line">ดูบทของฉัน ({game.scenario.title})</summary><CustomerBrief game={game} session={session} /></details>
  </section>;
}

function moodSummary(reactions: Partial<Record<ReactionKey, number>>) {
  return Object.entries(reactions).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, n]) => <span key={k} className="mood-chip">{reactionByKey[k as ReactionKey].emoji} {reactionByKey[k as ReactionKey].label} ×{n}</span>);
}

function CustomerFeedback({ game, act, busy }: P) {
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [comment, setComment] = useState('');
  const [nudge, setNudge] = useState(false);
  const counts = useMemo(() => {
    const c: Partial<Record<ReactionKey, number>> = {};
    for (const r of game.reactions) c[r.k] = (c[r.k] ?? 0) + 1;
    return c;
  }, [game.reactions]);
  const advisor = game.players[1 - game.me].name;
  const done = scores.filter(x => x > 0).length;
  function submit() {
    if (done < 5) { setNudge(true); document.querySelectorAll('.score-row')[scores.findIndex(x => !x)]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    void act({ action: 'feedback', scores, comment });
  }
  return <section className="narrow with-dock">
    <div className="role-hero role-hero-customer"><span>จบบทสนทนา</span><h1>ให้คะแนน {advisor}</h1><p>ในมุมของลูกค้า ตัวแทนใช้ SPIN ได้ดีแค่ไหน</p></div>
    <div className="card">
      <ScorePicker value={scores} onChange={setScores} highlightMissing={nudge} />
      <label className="field">ข้อเสนอแนะถึงตัวแทน (ไม่บังคับ)
        <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={400} rows={3} placeholder="เช่น ชอบที่ถามถึงลูกสาว ทำให้เริ่มคิดจริงๆ" />
      </label>
      {game.reactions.length > 0 && <div className="mood-summary"><span className="eyebrow">ความรู้สึกที่คุณกดระหว่างคุย · กำแพงเหลือ {game.wall}%</span><div>{moodSummary(counts)}</div></div>}
    </div>
    <div className="dock">
      <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={submit}>
        {done < 5 ? `ให้คะแนนแล้ว ${done}/5` : 'ส่งคะแนนให้ตัวแทน'} <ArrowRight size={20} /></button>
    </div>
  </section>;
}

function AdvisorWait({ game }: { game: Game }) {
  return <section className="narrow">
    <div className="card wait-card">
      <span className="eyebrow">จบบทสนทนาแล้ว</span>
      <h2>รอ {game.players[1 - game.me].name} ให้คะแนน…</h2>
      <div className="pulse-dot" />
      <p className="muted">ระหว่างรอ ลองทบทวนตัวเอง</p>
      <ul className="reflect">
        <li>ลูกค้าพูดถึงปัญหาด้วยตัวเองหรือยัง (P)</li>
        <li>คำถามไหนทำให้ลูกค้าเริ่มคิดจริงจัง (I)</li>
        <li>ลูกค้าบอกประโยชน์ของทางออกเองไหม (N)</li>
      </ul>
    </div>
  </section>;
}

function ReportCard({ r }: { r: Report }) {
  const avg = Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length * 10) / 10;
  const best = r.scores.indexOf(Math.max(...r.scores)), low = r.scores.indexOf(Math.min(...r.scores));
  return <article className="card report">
    <header>
      <div><span className="eyebrow">รอบที่ {r.round} · ลูกค้า{r.scenario}</span><h2>{r.advisor}</h2><p className="muted">ประเมินโดย {r.customer} · ใช้เวลา {mmss(r.seconds * 1000)} · ไปถึงขั้น {stages[r.stageReached].key}</p></div>
      <div className="avg"><b>{avg}</b><span>/ 5</span></div>
    </header>
    <Bars values={r.scores} />
    {typeof r.wall === 'number' && <div className="report-wall"><Wall level={r.wall} /><p className="muted small">กำแพงลูกค้าเริ่มที่ 80% ตอนจบเหลือ {r.wall}% {r.wall <= 45 ? '— ลูกค้าเปิดใจได้ดี 👏' : r.wall >= 80 ? '— ลูกค้ายังไม่เปิดใจ ลองถาม P/I ให้ตรงชีวิตลูกค้ามากขึ้น' : ''}</p></div>}
    <div className="report-points">
      <p>💪 <b>จุดแข็ง:</b> {criteria[best].label} — {criteria[best].hint}</p>
      {r.scores[low] < r.scores[best] && <p>🌱 <b>ฝึกเพิ่ม:</b> {criteria[low].label} — {criteria[low].hint}</p>}
    </div>
    {r.comment && <blockquote>“{r.comment}”</blockquote>}
    {Object.keys(r.reactions).length > 0 && <div className="mood-summary"><span className="eyebrow">ความรู้สึกลูกค้าระหว่างคุย</span><div>{moodSummary(r.reactions)}</div></div>}
  </article>;
}

function ReportView({ game, act, busy }: P) {
  const mine = game.reports;
  const latestIsMine = game.role === 'advisor' && mine.at(-1)?.round === game.round;
  return <section className="narrow">
    {latestIsMine
      ? <><div className="role-hero role-hero-advisor"><span>ผลจากลูกค้า</span><h1>รายงานของคุณ</h1></div><ReportCard r={mine.at(-1)!} /></>
      : <div className="card wait-card"><span className="eyebrow">ส่งคะแนนแล้ว ✓</span><h2>ขอบคุณที่เล่นบทลูกค้า</h2><p className="muted">รายงานส่งให้ตัวแทนแล้ว รอบถัดไปคุณจะได้เป็นตัวแทน</p></div>}
    <div className="sticky-actions">
      {mine.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => print()}><Printer size={18} /> พิมพ์ / PDF</button>}
      <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => act({ action: 'next' })}><RefreshCw size={20} /> สลับบทบาท เล่นรอบถัดไป</button>
    </div>
    {mine.length > 1 && <details className="history"><summary>รายงานรอบก่อนๆ ของคุณ ({mine.length - 1})</summary>
      {mine.slice(0, -1).reverse().map(r => <ReportCard key={r.createdAt} r={r} />)}</details>}
  </section>;
}
