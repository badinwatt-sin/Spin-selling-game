import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Brand, StageBadge } from '@/components/ui';
import { Illo, Shape } from '@/components/icons';
import { stages } from '@/lib/spin';
import LiveBanner from './live-banner';

const modules = [
  { n: '01', href: '/learn', illo: 'learn', title: 'เรียนรู้ SPIN', time: 'อ่าน 5 นาที', body: 'กำแพงลูกค้า 4 ขั้นของ SPIN ประโยคตัวอย่าง ประโยคเชื่อม และข้อผิดพลาดที่ตัวแทนทำบ่อย', cta: 'เปิดบทเรียน' },
  { n: '02', href: '/pair', illo: 'pair', title: 'Role Play เป็นคู่', time: '10–15 นาที / รอบ', body: 'สลับกันเป็นตัวแทนกับลูกค้าตามการ์ด ลูกค้ากดบอกความรู้สึกได้สดๆ ดูกำแพงลดลงแบบเรียลไทม์', cta: 'เริ่มฝึก' },
  { n: '03', href: '/class', illo: 'class', title: 'กิจกรรมทั้งคลาส', time: 'ใช้มือถือ', body: 'Post-it คิดคำถาม เกมทาย S/P/I/N แข่งตอบไว และให้ Feedback คู่ที่ขึ้น SHOW TIME', cta: 'เข้าร่วมคลาส' },
  { n: '04', href: '/class/admin', illo: 'coach', title: 'Coach Console', time: 'สำหรับผู้สอน', body: 'คุมเกมและกิจกรรมทั้งห้อง เปิดจอ Live ขึ้นโปรเจกเตอร์ สรุปผลทุกคู่ในคลิกเดียว', cta: 'ไปหน้าผู้สอน' },
] as const;

export default function Home() {
  return <main className="page home">
    <header className="topbar">
      <Brand />
      <nav className="top-nav" aria-label="เมนูหลัก">
        <a href="/learn">บทเรียน</a><a href="/pair">ฝึกคู่</a><a href="/class">เข้าคลาส</a><a className="nav-pill" href="/class/admin">ผู้สอน</a>
      </nav>
    </header>

    <section className="hero-x">
      <div className="hero-copy">
        <span className="tag">Course · Consultative Selling for Life Insurance</span>
        <h1>ถามให้ถูก<br /><span className="nowrap">ลูกค้า<mark>เปิดใจ</mark>เอง</span></h1>
        <p>ห้องเรียน SPIN Selling สำหรับตัวแทนประกันชีวิต เปลี่ยนจากคนขายเป็นที่ปรึกษา ด้วยคำถาม 4 ขั้นที่ใช้ได้จริงในการคุยกับลูกค้า</p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="/pair">เริ่มฝึก Role Play <ArrowRight size={20} /></a>
          <a className="btn btn-ghost btn-lg" href="/class">เข้าห้องเรียน</a>
        </div>
        <LiveBanner />
      </div>
      <div className="hero-hand" aria-hidden="true">
        {stages.map((s, i) => <div key={s.key} className={`hand-card hand-${i}`} style={{ '--c': s.color } as React.CSSProperties}>
          <Shape k={s.key} size={46} />
          <b className="hand-letter">{s.key}</b>
        </div>)}
      </div>
    </section>

    <div className="ticker" aria-hidden="true"><div>{Array.from({ length: 6 }, (_, i) => <span key={i}>Stop push selling <i>✦</i> Start helping customer <i>✦</i> </span>)}</div></div>

    <section className="syllabus">
      <header className="section-head"><span className="tag tag-ink">Syllabus</span><h2>เส้นทางการเรียนวันนี้</h2></header>
      <div className="module-grid">
        {modules.map(m => <a key={m.n} href={m.href} className="module">
          <div className="module-top"><span className="module-n">{m.n}</span><span className="chip">{m.time}</span></div>
          <Illo kind={m.illo} />
          <h3>{m.title}</h3>
          <p>{m.body}</p>
          <span className="module-go">{m.cta} <ArrowUpRight size={18} /></span>
        </a>)}
      </div>
    </section>

    <section className="spin-overview">
      <header className="section-head"><span className="tag tag-ink">Framework</span><h2>4 ขั้นของ SPIN Selling</h2>
        <p className="muted">การขายที่ใช้คำถาม นำไปสู่การนำเสนอและปิดการขาย — Don’t rush pushing product.</p></header>
      <div className="overview-grid">
        {stages.map((s, i) => <article key={s.key} className="overview-card" style={{ '--c': s.color } as React.CSSProperties}>
          <div className="overview-top"><StageBadge k={s.key} size="lg" /><span className="overview-n">0{i + 1}</span></div>
          <h3>{s.name}</h3>
          <p className="overview-meaning">{s.meaning}</p>
          <p className="overview-example">“{s.examples[0]}”</p>
        </article>)}
      </div>
    </section>
    <footer className="foot"><b>SPIN Lab</b> · SPIN Selling Technique (Neil Rackham) · เนื้อหาจาก SPIN Selling Master</footer>
  </main>;
}
