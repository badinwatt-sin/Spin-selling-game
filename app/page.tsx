import { ArrowRight, BookOpen, Presentation, Radio, Users } from 'lucide-react';
import { Brand, StageBadge } from '@/components/ui';
import { stages } from '@/lib/spin';
import LiveBanner from './live-banner';

export default function Home() {
  return <main className="page home">
    <header className="topbar"><Brand /><a className="ghost-link" href="/class/admin">สำหรับผู้สอน</a></header>

    <section className="hero">
      <span className="eyebrow">Consultative Selling · ประกันชีวิต</span>
      <h1>เปลี่ยนจาก<em>ตัวแทน</em><br />เป็น<em>ที่ปรึกษา</em>ด้วย SPIN</h1>
      <p>ฝึกถามให้ลูกค้าเห็นปัญหาและคุณค่าด้วยตัวเอง — Stop push selling, start helping customer.</p>
      <LiveBanner />
    </section>

    <section className="modes">
      <a className="mode mode-learn" href="/learn">
        <span className="mode-icon"><BookOpen size={28} /></span>
        <div><h2>เรียนรู้ SPIN</h2><p>กำแพงลูกค้า 4 ขั้น SPIN ตัวอย่างประโยค ประโยคเชื่อม และข้อผิดพลาดที่พบบ่อย สรุปจากบทเรียน</p></div>
        <span className="mode-go">อ่านสรุป <ArrowRight size={18} /></span>
      </a>
      <a className="mode mode-pair" href="/pair">
        <span className="mode-icon"><Users size={28} /></span>
        <div><h2>Role Play เป็นคู่</h2><p>สลับกันเป็นตัวแทนและลูกค้าตามการ์ด ตัวแทนมีตัวอย่างประโยคทุกขั้น ลูกค้ากดบอกความรู้สึกได้ระหว่างคุย</p></div>
        <span className="mode-go">เริ่มฝึก <ArrowRight size={18} /></span>
      </a>
      <a className="mode mode-class" href="/class">
        <span className="mode-icon"><Radio size={28} /></span>
        <div><h2>กิจกรรมทั้งคลาส</h2><p>Post-it คิดคำถาม เกมทาย S/P/I/N แข่งตอบเร็ว และ SHOW TIME ให้ Feedback คู่หน้าห้อง</p></div>
        <span className="mode-go">เข้าร่วม <ArrowRight size={18} /></span>
      </a>
      <a className="mode mode-admin" href="/class/admin">
        <span className="mode-icon"><Presentation size={28} /></span>
        <div><h2>ผู้สอน · จอ Live</h2><p>ควบคุม Post-it เกมทาย SPIN และ SHOW TIME แล้วเปิดจอ Live ขึ้นโปรเจกเตอร์</p></div>
        <span className="mode-go">ไปหน้าผู้สอน <ArrowRight size={18} /></span>
      </a>
    </section>

    <section className="spin-overview">
      <h2>4 ขั้นของ SPIN Selling</h2>
      <p className="muted">การขายที่ใช้คำถาม นำไปสู่การนำเสนอและปิดการขาย — Don’t rush pushing product!</p>
      <div className="overview-grid">
        {stages.map(s => <article key={s.key} className="overview-card" style={{ '--c': s.color } as React.CSSProperties}>
          <StageBadge k={s.key} size="lg" />
          <h3>{s.name}</h3>
          <p className="overview-meaning">{s.meaning}</p>
          <p className="overview-example">“{s.examples[0]}”</p>
        </article>)}
      </div>
    </section>
    <footer className="foot">SPIN Selling Technique · Neil Rackham · เนื้อหาจาก SPIN Selling Master (Consultative Selling)</footer>
  </main>;
}
