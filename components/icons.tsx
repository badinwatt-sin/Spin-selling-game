// Visual kit: S/P/I/N shape marks, brand mark, sticker icons and small mode illustrations.
// Shapes give each stage an identity beyond colour (circle · square · triangle · star), like quiz-show answer tiles.
import type { ComponentType, CSSProperties, ReactNode, SVGProps } from 'react';
import {
  AlertTriangle, ArrowRight, BookOpen, Check, Compass, Flag, Lightbulb, Link2, Lock, MessageCircle, Mic, Sprout, Star,
  StickyNote, Target, ThumbsUp, Trophy, User, Users, Zap,
} from 'lucide-react';

export type StageKey = 'S' | 'P' | 'I' | 'N';
const stageColor: Record<StageKey, string> = { S: '#00008F', P: '#027180', I: '#FF1721', N: '#1E8A49' };

export function ShapePath({ k }: { k: StageKey }) {
  switch (k) {
    case 'S': return <circle cx="50" cy="50" r="44" />;
    case 'P': return <rect x="8" y="8" width="84" height="84" rx="18" />;
    case 'I': return <path d="M50 6 L95 88 Q97 94 90 94 L10 94 Q3 94 5 88 Z" />;
    case 'N': return <path d="M50 4 L62 34 L95 38 L70 60 L78 94 L50 76 L22 94 L30 60 L5 38 L38 34 Z" />;
  }
}

// Filled stage shape with its letter. Used for badges, tiles and the brand mark.
export function StageMark({ k, size = 40, color, ink, className }: { k: StageKey; size?: number; color?: string; ink?: string; className?: string }) {
  const ty = k === 'I' ? 66 : k === 'N' ? 62 : 52;
  return <svg className={`stage-mark ${className ?? ''}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <g fill={color ?? stageColor[k]} stroke={ink ?? 'none'} strokeWidth={ink ? 5 : 0} strokeLinejoin="round"><ShapePath k={k} /></g>
    <text x="50" y={ty} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontFamily="var(--font-ui)" fontWeight="800" fontSize={k === 'I' || k === 'N' ? 34 : 46}>{k}</text>
  </svg>;
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return <svg className="brand-svg" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="26" cy="26" r="20" fill="#00008F" />
    <rect x="56" y="6" width="38" height="38" rx="9" fill="#027180" />
    <path d="M26 54 L47 92 L5 92 Z" fill="#FF1721" strokeLinejoin="round" />
    <path d="M75 52 L80 66 L95 67 L83 76 L87 92 L75 83 L63 92 L67 76 L55 67 L70 66 Z" fill="#1E8A49" />
  </svg>;
}

const icons = {
  target: Target, advisor: User, customer: MessageCircle, strength: Zap, grow: Sprout, idea: Lightbulb, trophy: Trophy,
  note: StickyNote, mic: Mic, like: ThumbsUp, lock: Lock, check: Check, warn: AlertTriangle, flag: Flag, link: Link2,
  users: Users, chat: MessageCircle, compass: Compass, star: Star, book: BookOpen, arrow: ArrowRight,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement> & { size?: number }>>;
export type IconName = keyof typeof icons;

// Inline icon that sits on the text baseline.
export function Ico({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const C = icons[name];
  return <C size={size} strokeWidth={2.2} className={`ico ${className ?? ''}`} aria-hidden="true" />;
}

// Chunky "sticker" icon: tinted tile with ink border and offset shadow, slightly rotated.
export function Sticker({ name, tone = 'blue', size = 22, tilt = -4 }: { name: IconName; tone?: 'blue' | 'red' | 'teal' | 'green' | 'yellow' | 'paper'; size?: number; tilt?: number }) {
  return <span className={`sticker sticker-${tone}`} style={{ '--tilt': `${tilt}deg` } as CSSProperties}><Ico name={name} size={size} /></span>;
}

// Small two-colour illustrations for the home page modes. Ink outlines, flat fills.
const ink = { stroke: '#0b0b3b', strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
export function Illo({ kind }: { kind: 'learn' | 'pair' | 'class' | 'coach' }): ReactNode {
  return <svg className="illo" viewBox="0 0 160 110" aria-hidden="true">
    {kind === 'learn' && <>
      <circle cx="122" cy="30" r="20" fill="#FFE45C" />
      <path d="M20 30 Q50 18 80 30 L80 96 Q50 84 20 96 Z" fill="#fff" {...ink} />
      <path d="M80 30 Q110 18 140 30 L140 96 Q110 84 80 96 Z" fill="#E8E8F6" {...ink} />
      <path d="M32 46 L66 40 M32 58 L66 52 M32 70 L58 65" {...ink} strokeWidth={2.5} />
      <g transform="translate(96 44) scale(.32)"><circle cx="50" cy="50" r="44" fill="#00008F" /></g>
      <g transform="translate(112 58) scale(.28)"><path d="M50 6 L95 88 L5 88 Z" fill="#FF1721" /></g>
    </>}
    {kind === 'pair' && <>
      <rect x="96" y="62" width="44" height="34" rx="8" fill="#FFE45C" />
      <path d="M14 18 H86 Q94 18 94 26 V58 Q94 66 86 66 H44 L28 80 V66 H22 Q14 66 14 58 V26 Q14 18 22 18 Z" fill="#00008F" {...ink} />
      <path d="M70 40 H140 Q148 40 148 48 V78 Q148 86 140 86 H134 V98 L120 86 H78 Q70 86 70 78 V48 Q70 40 78 40 Z" fill="#fff" {...ink} />
      <text x="42" y="49" fill="#fff" fontWeight="800" fontSize="22" fontFamily="var(--font-ui)">S·P</text>
      <text x="92" y="71" fill="#FF1721" fontWeight="800" fontSize="22" fontFamily="var(--font-ui)">I·N</text>
    </>}
    {kind === 'class' && <>
      <circle cx="132" cy="22" r="14" fill="#FFE45C" />
      <rect x="16" y="16" width="60" height="38" rx="9" fill="#00008F" {...ink} />
      <rect x="84" y="16" width="60" height="38" rx="9" fill="#027180" {...ink} />
      <rect x="16" y="60" width="60" height="38" rx="9" fill="#FF1721" {...ink} />
      <rect x="84" y="60" width="60" height="38" rx="9" fill="#1E8A49" {...ink} />
      <circle cx="46" cy="35" r="9" fill="#fff" /><rect x="105" y="26" width="18" height="18" rx="4" fill="#fff" />
      <path d="M46 69 L56 88 L36 88 Z" fill="#fff" /><path d="M114 68 L117 76 L125 77 L119 82 L121 90 L114 86 L107 90 L109 82 L103 77 L111 76 Z" fill="#fff" />
    </>}
    {kind === 'coach' && <>
      <circle cx="30" cy="86" r="16" fill="#FFE45C" />
      <rect x="22" y="12" width="118" height="74" rx="10" fill="#fff" {...ink} />
      <path d="M81 86 V100 M60 100 H102" {...ink} />
      <rect x="40" y="52" width="14" height="22" rx="3" fill="#00008F" />
      <rect x="62" y="40" width="14" height="34" rx="3" fill="#027180" />
      <rect x="84" y="30" width="14" height="44" rx="3" fill="#FF1721" />
      <rect x="106" y="46" width="14" height="28" rx="3" fill="#1E8A49" />
      <path d="M112 18 L115 25 L123 26 L117 31 L119 39 L112 35 L105 39 L107 31 L101 26 L109 25 Z" fill="#FFE45C" {...ink} strokeWidth={2} />
    </>}
  </svg>;
}

// Shape only (no letter), e.g. white on a coloured answer tile.
export function Shape({ k, size = 36, color = '#fff' }: { k: StageKey; size?: number; color?: string }) {
  return <svg className="shape" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"><g fill={color}><ShapePath k={k} /></g></svg>;
}
