'use client';
import { Maximize, Star } from 'lucide-react';
import { mmss, useClock } from '@/lib/client';
import { Bars, Brand, Qr, StageBadge, useOrigin } from '@/components/ui';
import { showtimeCriteria, stages } from '@/lib/spin';
import { postit } from '@/lib/content';
import { ChoiceLegend, Countdown, Podium, ShowtimeTable, stageOf, useClass, type ClassView, type FeedbackView, type PostitView, type QuizView } from './shared';
import { Distribution } from './admin';

export default function Display() {
  const { data, error } = useClass('display', 1500);
  const origin = useOrigin();
  const join = `${origin}/class`;
  const a = data?.activity;
  return <main className="display">
    <header className="display-top">
      <Brand />
      <div className="display-meta">
        {data && <span>👥 {data.people} คน</span>}
        {error ? <span className="offline">● เชื่อมต่อใหม่…</span> : <span className="online">● LIVE</span>}
        <button type="button" className="icon-btn" aria-label="เต็มจอ" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize size={18} /></button>
      </div>
    </header>
    {!data ? <div className="loading">กำลังโหลด…</div>
      : !a ? <Idle join={join} data={data} />
      : a.kind === 'quiz' ? <QuizScreen q={a} now={data.now} join={join} people={data.people} />
      : a.kind === 'postit' ? <PostitScreen p={a} now={data.now} join={join} people={data.people} />
      : a.kind === 'recap' ? <section className="display-center"><span className="display-kicker">🏆 SHOW TIME</span><h1 className="display-hero">สรุปทุกคู่</h1><ShowtimeTable rows={data.showtime} big /></section>
      : <FeedbackScreen f={a} now={data.now} join={join} people={data.people} />}
  </main>;
}

function JoinPanel({ join, people, size = 220 }: { join: string; people: number; size?: number }) {
  return <div className="join-panel">
    {join.startsWith('http') && <Qr url={join} size={size} />}
    <div><span>สแกนหรือเปิด</span><b>{join.replace(/^https?:\/\//, '')}</b><em>{people} คนเข้าร่วมแล้ว</em></div>
  </div>;
}

function Tiles() {
  return <div className="tiles">{stages.map(s => <div key={s.key} className="tile" style={{ '--c': s.color } as React.CSSProperties}><b>{s.key}</b><span>{s.name.replace(' Question', '')}</span></div>)}</div>;
}

function Idle({ join, data }: { join: string; data: ClassView }) {
  return <section className="display-center">
    <h1 className="display-hero">Stop push selling,<br />start helping customer.</h1>
    <JoinPanel join={join} people={data.people} size={260} />
    {data.showtime.length > 0 ? <ShowtimeTable rows={data.showtime} big /> : <ChoiceLegend compact />}
  </section>;
}

function QuizScreen({ q, now: serverNow, join, people }: { q: QuizView; now: number; join: string; people: number }) {
  const now = useClock(serverNow, 100);
  if (q.phase === 'lobby') return <section className="display-center">
    <span className="display-kicker">🎯 เกมทาย SPIN · {q.total} ข้อ · ข้อละ {q.timeLimit} วินาที</span>
    <h1 className="display-hero">ประโยคนี้คือ S, P, I หรือ N?</h1>
    <ChoiceLegend />
    <JoinPanel join={join} people={people} />
  </section>;

  if (q.phase === 'question' && q.question) return <section className="display-quiz">
    <div className="display-quiz-head"><span>ข้อ {q.index + 1} / {q.total}</span><span>{q.answered} / {people} คนตอบแล้ว</span></div>
    <Countdown closesAt={q.closesAt} openedAt={q.openedAt} now={now} />
    <span className="context">{q.question.context}</span>
    <blockquote className="display-quote">“{q.question.line}”</blockquote>
    <Tiles />
  </section>;

  if (q.phase === 'reveal' && q.reveal) {
    const right = stageOf(q.reveal.answer);
    return <section className="display-reveal">
      <div className="reveal-left">
        <span className="display-kicker">เฉลยข้อ {q.reveal.index + 1}</span>
        {q.question && <blockquote className="display-quote small">“{q.question.line}”</blockquote>}
        <div className="reveal-answer big" style={{ '--c': right.color } as React.CSSProperties}><StageBadge k={right.key} size="lg" /><div><b>{right.name}</b><span>{right.meaning}</span></div></div>
        <p className="why">💡 {q.reveal.why}</p>
        <Distribution q={q} />
      </div>
      <div className="reveal-right">
        {q.reveal.fastest.length > 0 && <div className="fastest">⚡ เร็วที่สุด: {q.reveal.fastest.map(f => `${f.name} (${(f.ms / 1000).toFixed(1)} วิ)`).join(' · ')}</div>}
        <h2>กระดานคะแนน</h2>
        <ol className="board board-display">{q.board.slice(0, 8).map((p, i) => <li key={p.pid}><span>#{i + 1}</span><b>{p.name}</b>{p.last > 0 && <em>+{p.last}</em>}<span>{p.score.toLocaleString()}</span></li>)}</ol>
      </div>
    </section>;
  }

  return <section className="display-center">
    <span className="display-kicker">🏆 สรุปผลเกมทาย SPIN</span>
    <h1 className="display-hero">3 อันดับแรก</h1>
    <Podium board={q.board} />
    {q.board.length > 3 && <ol className="board board-display board-rest">{q.board.slice(3, 10).map((p, i) => <li key={p.pid}><span>#{i + 4}</span><b>{p.name}</b><span>{p.score.toLocaleString()}</span></li>)}</ol>}
  </section>;
}

function PostitScreen({ p, now: serverNow, join, people }: { p: PostitView; now: number; join: string; people: number }) {
  const now = useClock(serverNow, 500);
  const s = stageOf(p.stage);
  const left = p.endsAt - now;
  const head = <div className="postit-head" style={{ '--c': s.color } as React.CSSProperties}>
    <StageBadge k={s.key} size="lg" />
    <div><span className="display-kicker">📝 #กิจกรรม Post-it · {s.name}</span><h1>{s.meaning}</h1>{p.scenarioTitle && <p>โจทย์: ลูกค้า{p.scenarioTitle} — {p.scenarioBrief}</p>}</div>
  </div>;
  if (p.phase === 'writing') return <section className="display-center">
    {head}
    <div className="display-timer">{left > 0 ? mmss(left) : 'หมดเวลา'}</div>
    <div className="vote-count"><b>{p.written}</b><span>/ {people} คนแปะ Post-it แล้ว</span></div>
    <JoinPanel join={join} people={people} size={180} />
  </section>;
  const notes = [...p.notes].sort((x, y) => Number(y.star) - Number(x.star));
  return <section className="display-postit">
    {head}
    <div className="postit-wall">{notes.map((n, i) => <div key={i} className={`postit-note ${n.star ? 'star' : ''}`} style={{ '--c': s.color, '--r': `${((i * 37) % 7) - 3}deg` } as React.CSSProperties}>
      <span>{n.text}</span><small>{n.name}</small>{n.star && <Star className="star-icon" size={26} fill="currentColor" />}</div>)}
      {notes.length === 0 && <p className="why">ยังไม่มี Post-it</p>}
    </div>
    <p className="postit-hint">{postit[p.stage].prompt}</p>
  </section>;
}

function FeedbackScreen({ f, now: serverNow, join, people }: { f: FeedbackView; now: number; join: string; people: number }) {
  const now = useClock(serverNow, 1000);
  const pair = <p className="display-pair"><b>🧑‍💼 {f.advisor}</b> <small>ตัวแทน</small>{f.customer && <> × <b>🙋 {f.customer}</b> <small>ลูกค้า{f.scenarioTitle ?? ''}</small></>}</p>;
  const left = f.startedAt + f.duration * 1000 - now;

  if (f.phase === 'roleplay') return <section className="display-center">
    <span className="display-kicker live-kicker">● SHOW TIME · SPIN + Present Solution</span>
    {pair}
    <div className={`display-timer ${left < 60_000 ? 'low' : ''}`}>{left >= 0 ? mmss(left) : `+${mmss(-left)}`}</div>
    <div className="watch-grid">{showtimeCriteria.map((c, i) => <div key={c.key} style={{ '--c': i < 4 ? stages[i].color : i === 4 ? '#7a5cf0' : '#e5a400' } as React.CSSProperties}>
      <span className="stage-badge stage-badge-md" style={{ background: 'var(--c)' }}>{c.key}</span><b>{c.label}</b><span>{c.hint}</span></div>)}</div>
  </section>;

  if (f.phase === 'voting') return <section className="display-center">
    <span className="display-kicker">🎤 ให้ Feedback ตัวแทน</span>
    {pair}
    <div className="vote-count"><b>{f.ballots}</b><span>/ {people} คนส่งแล้ว</span></div>
    <JoinPanel join={join} people={people} />
  </section>;

  const s = f.summary;
  if (!s) return null;
  const vals = s.criteria.map(x => x ?? 0);
  const best = vals.indexOf(Math.max(...vals));
  const low = vals.indexOf(Math.min(...vals));
  return <section className="display-results">
    <div className="results-head">
      {pair}
      <div className="avg avg-display"><b>{s.overall ?? '–'}</b><span>/ 5<br />{s.count} คนประเมิน</span></div>
    </div>
    <div className="results-grid">
      <div className="card"><h2>คะแนนแต่ละด้าน</h2><Bars values={s.criteria} list={showtimeCriteria} />
        {s.count > 0 && <div className="report-points">
          <p>💪 <b>เด่นที่สุด:</b> {showtimeCriteria[best].label}</p>
          {low !== best && <p>🌱 <b>ฝึกเพิ่ม:</b> {showtimeCriteria[low].label}</p>}
        </div>}
      </div>
      <div className="card">
        <h2>💪 จุดเด่น</h2>
        <div className="tag-cloud good">{s.strengths.length ? s.strengths.map(t => <span key={t.tag}>{t.tag} <b>{t.count}</b></span>) : <em>—</em>}</div>
        <h2>🌱 ควรพัฒนา</h2>
        <div className="tag-cloud warn">{s.improves.length ? s.improves.map(t => <span key={t.tag}>{t.tag} <b>{t.count}</b></span>) : <em>—</em>}</div>
      </div>
      {s.notes.length > 0 && <div className="card notes-card"><h2>💬 ความเห็นจากเพื่อนๆ</h2>
        <div className="notes">{s.notes.slice(0, 16).map((n, i) => <div key={i} className="note">{n.good && <p>👍 {n.good}</p>}{n.tip && <p>💡 {n.tip}</p>}</div>)}</div></div>}
    </div>
  </section>;
}
