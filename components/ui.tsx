'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { criteria, scoreWords, stages, type StageKey } from '@/lib/spin';

export function Brand({ small }: { small?: boolean }) {
  return <a href="/" className={`brand ${small ? 'brand-small' : ''}`} aria-label="SPIN Selling Game หน้าแรก">
    <span className="brand-mark" aria-hidden="true">
      {(['S', 'P', 'I', 'N'] as const).map((k, i) => <i key={k} style={{ background: stages[i].color }}>{k}</i>)}
    </span>
    <span className="brand-text">SPIN Selling Game<small>Role Play Lab · ประกันชีวิต</small></span>
  </a>;
}

// S > P > I > N progress. When `onPick` is given, every step is a button (advisor can go back and forth).
export function Stepper({ current, reached = current, onPick, compact }: { current: number; reached?: number; onPick?: (i: number) => void; compact?: boolean }) {
  return <ol className={`stepper ${compact ? 'stepper-compact' : ''}`} aria-label="ลำดับ SPIN">
    {stages.map((s, i) => {
      const state = i === current ? 'now' : i <= reached ? 'done' : 'todo';
      const inner = <>
        <b>{s.key}</b>
        <span className="step-name">{s.name.replace(' Question', '')}</span>
        {!compact && <span className="step-thai">{s.thai}</span>}
      </>;
      return <li key={s.key} className={`step step-${state}`} style={{ '--c': s.color } as React.CSSProperties}>
        {onPick
          ? <button type="button" onClick={() => onPick(i)} aria-current={i === current ? 'step' : undefined}>{inner}</button>
          : <div aria-current={i === current ? 'step' : undefined}>{inner}</div>}
        {i < 3 && <span className="step-arrow" aria-hidden="true">›</span>}
      </li>;
    })}
  </ol>;
}

export function StageBadge({ k, size = 'md' }: { k: StageKey; size?: 'sm' | 'md' | 'lg' }) {
  const s = stages.find(x => x.key === k)!;
  return <span className={`stage-badge stage-badge-${size}`} style={{ background: s.color }}>{k}</span>;
}

type Criteria = typeof criteria;
export function ScorePicker({ value, onChange, list = criteria, highlightMissing }: { value: number[]; onChange: (v: number[]) => void; list?: Criteria; highlightMissing?: boolean }) {
  return <div className="score-list">
    {list.map((c, i) => <fieldset key={c.key} className={`score-row ${highlightMissing && !value[i] ? 'missing' : ''}`}>
      <legend><span className="score-key">{c.key}</span> <b>{c.label}</b> <small>{c.hint}</small></legend>
      <div className="score-buttons">
        {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-pressed={value[i] === n}
          className={value[i] === n ? 'on' : ''} onClick={() => { const v = [...value]; v[i] = n; onChange(v); }}
          aria-label={`${c.label} ${n} คะแนน ${scoreWords[n]}`}>{n}</button>)}
      </div>
      <span className="score-word">{value[i] ? scoreWords[value[i]] : 'แตะเพื่อให้คะแนน'}</span>
    </fieldset>)}
  </div>;
}

export function Bars({ values, max = 5, list = criteria }: { values: (number | null)[]; max?: number; list?: Criteria }) {
  return <div className="bars">
    {list.map((c, i) => <div className="bar-row" key={c.key}>
      <span className="bar-label"><b>{c.key}</b> {c.label}</span>
      <span className="bar-track"><span className="bar-fill" style={{ width: `${((values[i] ?? 0) / max) * 100}%`, background: i < 4 ? stages[i].color : i === 4 ? '#7a5cf0' : '#e5a400' }} /></span>
      <span className="bar-value">{values[i] ?? '–'}</span>
    </div>)}
  </div>;
}

export function Chips({ options, value, onChange, tone }: { options: string[]; value: string[]; onChange: (v: string[]) => void; tone: 'good' | 'warn' }) {
  return <div className={`chips chips-${tone}`}>
    {options.map(o => {
      const on = value.includes(o);
      return <button type="button" key={o} className={on ? 'on' : ''} aria-pressed={on}
        onClick={() => onChange(on ? value.filter(x => x !== o) : value.length >= 4 ? value : [...value, o])}>{on ? '✓ ' : ''}{o}</button>;
    })}
  </div>;
}

export function Qr({ url, size = 240 }: { url: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: size * 2, color: { dark: '#071d48', light: '#ffffff' } }).then(setSrc).catch(() => setSrc('')); }, [url, size]);
  return src ? <img className="qr" src={src} width={size} height={size} alt={`QR code สำหรับเข้าร่วม ${url}`} /> : <div className="qr" style={{ width: size, height: size }} />;
}

export function useOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

export function Notice({ error, onClose }: { error?: string; onClose?: () => void }) {
  if (!error) return null;
  return <div className="notice" role="alert">{error}{onClose && <button type="button" onClick={onClose} aria-label="ปิด">×</button>}</div>;
}

// กำแพงลูกค้า: a brick wall that drops as the customer opens up.
export function Wall({ level, compact }: { level: number; compact?: boolean }) {
  const rows = 5, filled = Math.round((level / 100) * rows);
  const tone = level <= 45 ? 'good' : level <= 70 ? 'neutral' : 'warn';
  const label = level <= 20 ? 'เปิดใจแล้ว' : level <= 45 ? 'เริ่มเปิดใจ' : level <= 70 ? 'ยังระวังตัว' : 'กำแพงสูง';
  return <div className={`wall wall-${tone} ${compact ? 'wall-compact' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} aria-label={`กำแพงลูกค้า ${level}%`}>
    <div className="wall-bricks" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <span key={i} className={rows - i <= filled ? 'on' : ''} />)}
    </div>
    <div className="wall-text"><small>กำแพงลูกค้า</small><b>{label}</b>{!compact && <em>{level}%</em>}</div>
  </div>;
}
