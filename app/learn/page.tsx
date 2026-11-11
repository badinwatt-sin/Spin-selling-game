import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Brand, StageBadge } from '@/components/ui';
import { stages } from '@/lib/spin';
import { bridges, learn, presentSolution, readySignals, sTopics } from '@/lib/content';
import { Ico, Sticker } from '@/components/icons';

export const metadata: Metadata = { title: 'เรียนรู้ SPIN · SPIN Selling Game' };

export default function LearnPage() {
  return <main className="page learn">
    <header className="topbar"><Brand /><a className="ghost-link" href="/pair">ไปฝึก Role Play</a></header>
    <section className="hero">
      <span className="eyebrow">Consultative Selling · SPIN Selling Technique (Neil Rackham)</span>
      <h1>เรียนรู้ SPIN<br />ใน 5 นาที</h1>
      <p>สรุปจากบทเรียน SPIN Selling Master สำหรับตัวแทนประกันชีวิต ใช้ทบทวนก่อนฝึก Role Play</p>
      <nav className="learn-nav" aria-label="สารบัญ">
        <a href="#wall">กำแพงลูกค้า</a><a href="#advisor">Agent → Advisor</a><a href="#stages">4 ขั้น SPIN</a><a href="#present">Present Solution</a><a href="#mistakes">ข้อผิดพลาดที่พบบ่อย</a>
      </nav>
    </section>

    <section id="wall" className="card learn-wall">
      <div className="wall-art" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} />)}</div>
      <div><h2>{learn.wall.title}</h2><p>{learn.wall.body}</p></div>
    </section>

    <section id="advisor" className="learn-section">
      <h2>Transform Agent to Advisor</h2>
      <p className="muted">SPIN Selling ช่วยงานขายประกันชีวิตได้ 5 ด้าน</p>
      <ol className="impact-grid">{learn.agentToAdvisor.map((x, i) => <li key={x.title} className="card"><b className="impact-n">{i + 1}</b><h3>{x.title}</h3><p>{x.body}</p></li>)}</ol>
    </section>

    <section id="stages" className="learn-section">
      <h2>4 ขั้นของ SPIN</h2>
      <p className="muted">การขายที่ใช้คำถาม นำไปสู่การนำเสนอและปิดการขาย — Don’t rush pushing product!</p>
      {stages.map((s, i) => {
        const bridge = bridges.find(b => b.from === s.key);
        return <article key={s.key} className="card learn-stage" style={{ '--c': s.color } as React.CSSProperties}>
          <header><StageBadge k={s.key} size="lg" /><div><h3>{s.name}</h3><p>{s.meaning}</p></div></header>
          <p className="goal"><Ico name="target" /> {s.goal}</p>
          {s.key === 'S' && <div className="learn-block"><b>6 หัวข้อที่ควรรู้ (จากสไลด์)</b>
            <ul className="topic-list">{sTopics.map(t => <li key={t.label}><b>{t.label}</b><span>“{t.question}”</span></li>)}</ul></div>}
          <div className="learn-cols">
            <div className="learn-block"><b>ตัวอย่างประโยค</b><ul className="lines">{s.examples.map(l => <li key={l}>“{l}”</li>)}</ul></div>
            <div className="learn-block">
              <b><Ico name="check" /> ทำแบบนี้</b><ul>{s.doThis.map(t => <li key={t}>{t}</li>)}</ul>
              <b><Ico name="warn" /> ระวัง</b><p>{s.avoid}</p>
              <b><Ico name="flag" /> พร้อมไปขั้นถัดไปเมื่อ</b><ul>{readySignals[s.key].map(t => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
          {bridge && <p className="bridge"><Ico name="link" /> เชื่อมไป {stages[i + 1].name}: “{bridge.lines[0]}”</p>}
        </article>;
      })}
    </section>

    <section id="present" className="card learn-section">
      <h2>SPIN + Present Solution</h2>
      <p className="muted">เมื่อลูกค้าบอกประโยชน์ของทางออกเองแล้ว จึงค่อยนำเสนอ</p>
      <ul className="lines">{presentSolution.bridge.map(l => <li key={l}>“{l}”</li>)}</ul>
      <ol className="steps">{presentSolution.steps.map(x => <li key={x.title}><b>{x.title}</b> — {x.detail}</li>)}</ol>
    </section>

    <section id="mistakes" className="learn-section">
      <h2>ข้อผิดพลาดที่พบบ่อย</h2>
      <div className="mistake-grid">{learn.mistakes.map(m => <div key={m.mistake} className="card mistake"><p className="mistake-bad">✗ {m.mistake}</p><p className="mistake-fix">✓ {m.fix}</p></div>)}</div>
    </section>

    <a className="btn btn-primary btn-lg learn-cta" href="/pair">พร้อมแล้ว ไปฝึก Role Play <ArrowRight size={20} /></a>
  </main>;
}
