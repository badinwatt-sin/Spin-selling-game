// Shared SPIN content used by both the pair role play and the class activities.
// Wording follows the "SPIN Selling Master" deck (Consultative Selling, AXA PRIME Mentorship).

export type StageKey = 'S' | 'P' | 'I' | 'N';

export type Stage = {
  key: StageKey;
  name: string;      // full English name
  thai: string;      // short Thai label
  meaning: string;   // one-line definition from the deck
  goal: string;      // what the advisor is trying to achieve
  doThis: string[];  // quick coaching tips
  avoid: string;     // the common mistake at this stage
  examples: string[]; // generic example lines from the deck
  color: string;
};

export const stages: Stage[] = [
  {
    key: 'S',
    name: 'Situation Question',
    thai: 'เข้าใจสถานการณ์',
    meaning: 'คำถามเพื่อเข้าใจสถานการณ์ของลูกค้า',
    goal: 'รู้จักภาพรวมชีวิต การงาน การออม สวัสดิการ และภาระค่าใช้จ่าย เพื่อจับประเด็นที่เราช่วยแก้ได้จริง',
    doThis: [
      'เริ่มด้วยคำถามปลายเปิด แล้วตั้งใจฟัง',
      'ถามแค่ 3–4 ข้อที่จำเป็น ไม่ซักเหมือนสอบสวน',
      'จดคำสำคัญที่ลูกค้าพูด เพื่อใช้ต่อใน P',
    ],
    avoid: 'ถามข้อมูลยาวเป็นแบบฟอร์ม หรือรีบพูดถึงสินค้า',
    examples: [
      'ไม่ทราบว่าช่วงนี้หลังโควิด ธุรกิจของคุณลูกค้าเป็นอย่างไรบ้างครับ',
      'ช่วงนี้ของแพงขึ้น ต้นทุนสูงขึ้น ไม่ทราบว่าคุณลูกค้าได้รับผลกระทบอย่างไรบ้างครับ',
      'รายจ่ายแต่ละเดือนคงสูงขึ้นทุกปี คุณลูกค้ามีแผนเก็บออมให้ลูกและรองรับภาระนี้อย่างไรครับ',
      'สวัสดิการที่มีอยู่ตอนนี้ดูแลเรื่องสุขภาพของคุณและครอบครัวในส่วนไหนบ้างครับ',
    ],
    color: '#2258eb',
  },
  {
    key: 'P',
    name: 'Problem Question',
    thai: 'ค้นหาปัญหา',
    meaning: 'คำถามเพื่อให้ลูกค้าเห็นปัญหาของลูกค้าเอง',
    goal: 'ให้ลูกค้าพูดออกมาเองว่ามีข้อกังวล ช่องว่าง หรือความต้องการอะไรในอนาคต',
    doThis: [
      'ต่อยอดจากสิ่งที่ลูกค้าเล่าใน S',
      'ถามว่า “กังวล / ไม่พอใจ / ยาก” ตรงไหน',
      'สรุปทวนสิ่งที่ได้ยิน ให้ลูกค้ายืนยัน',
    ],
    avoid: 'บอกปัญหาแทนลูกค้า หรือรีบเสนอทางออก (Don’t rush pushing product!)',
    examples: [
      'ในช่วงที่เงินเฟ้อมีแนวโน้มเพิ่มขึ้นทุกปี คุณลูกค้าคิดว่าควรวางแผนการเงินเพื่ออนาคตอย่างไรดีครับ',
      'หากเศรษฐกิจยังอยู่ช่วงขาลงแบบนี้ไปอีก 5–10 ปี คิดว่าภาระค่าใช้จ่ายจะกระทบแผนการเงินอย่างไรครับ',
      'จากแนวโน้มค่าเทอมโรงเรียนและมหาวิทยาลัยที่สูงขึ้นทุกปี คุณลูกค้าคิดเห็นอย่างไรครับ',
      'ที่ผ่านมามีครั้งไหนไหมครับ ที่ค่าใช้จ่ายไม่คาดฝันทำให้ต้องดึงเงินเก็บออกมาใช้',
    ],
    color: '#f08a24',
  },
  {
    key: 'I',
    name: 'Implication Question',
    thai: 'ขยายผลกระทบ',
    meaning: 'คำถามเพื่อให้ลูกค้าตระหนักถึงปัญหาและขยายผลกระทบ',
    goal: 'ชวนลูกค้าคิดต่อว่าถ้าปัญหานี้เกิดขึ้นจริง จะกระทบตัวเองและครอบครัวแค่ไหน ทั้งเรื่องเงินและความรู้สึก',
    doThis: [
      'เชื่อมปัญหากับคนที่ลูกค้ารัก (ความรู้สึก ห่วงใย)',
      'ใช้ตัวเลขหรือสถิติประกอบอย่างพอดี',
      'เว้นช่วงให้ลูกค้าได้คิด ไม่ต้องรีบเติมคำ',
    ],
    avoid: 'ขู่ให้กลัวจนลูกค้าปิดใจ หรือข้ามขั้นไปขายเลย',
    examples: [
      'หากแนวโน้มเงินเฟ้อลากยาวไปอีก 10 ปี การวางแผนเกษียณของคุณลูกค้าและครอบครัวจะเป็นอย่างไรครับ',
      'จากสถิติ ค่ารักษามะเร็งในโรงพยาบาลเอกชนสูงขึ้นเรื่อยๆ หากวันหนึ่งเป็นเราหรือครอบครัว จะกระทบเงินเก็บของเราอย่างไรครับ',
      'กว่าลูกจะเรียนจบคงอีกกว่า 10 ปี คุณลูกค้าเห็นด้วยไหมครับว่าเราต้องมีหลักประกันที่มั่นคงให้ลูกเรียนจบอย่างที่ฝันไว้',
    ],
    color: '#e0457b',
  },
  {
    key: 'N',
    name: 'Need-Payoff Question',
    thai: 'เห็นคุณค่าทางออก',
    meaning: 'คำถามเพื่อให้ลูกค้าเห็นถึงผลดี หากปัญหานั้นแก้ไขได้',
    goal: 'ให้ลูกค้าพูดถึงประโยชน์ของทางออกด้วยตัวเอง ก่อนที่เราจะนำเสนอแผน',
    doThis: [
      'ถาม “ถ้า… ได้ คุณคิดว่าอย่างไร”',
      'ให้ลูกค้าเป็นคนบอกประโยชน์เอง',
      'ปิดด้วยการสรุปความต้องการ แล้วค่อยนัดนำเสนอแผน',
    ],
    avoid: 'พูดสรรพคุณสินค้ายาวๆ แทนการถาม',
    examples: [
      'ไม่ว่าอะไรจะเกิดขึ้น แต่เรายังมีหลักประกันให้ลูกเรียนจบอย่างตั้งใจ คุณลูกค้าคิดว่าอย่างไรครับ',
      'ถ้าเรามีกองทุนอีกก้อนแยกสำรองไว้ เพื่อไม่ให้ค่าใช้จ่ายไม่คาดฝันกระทบเงินเก็บ คิดว่าอย่างไรครับ',
      'หากมีแผนออมที่การันตีว่าจะมีเงินพอในวันที่อายุยืนยาวขึ้น แถมช่วยลดภาษีทุกปี คุณลูกค้าคิดว่าดีไหมครับ',
    ],
    color: '#14a37f',
  },
];

export const stageByKey = Object.fromEntries(stages.map(s => [s.key, s])) as Record<StageKey, Stage>;

// Five criteria used for both the partner's feedback and the class peer feedback.
export const criteria: { key: string; label: string; hint: string }[] = [
  { key: 'S', label: 'Situation', hint: 'ถามเพื่อเข้าใจสถานการณ์ได้ตรงประเด็น' },
  { key: 'P', label: 'Problem', hint: 'ช่วยให้ลูกค้าพูดถึงปัญหา/ข้อกังวลเอง' },
  { key: 'I', label: 'Implication', hint: 'ขยายผลกระทบให้ลูกค้าตระหนัก' },
  { key: 'N', label: 'Need-Payoff', hint: 'ให้ลูกค้าเห็นคุณค่าของทางออกเอง' },
  { key: '♥', label: 'Listening', hint: 'ฟัง ทวนสรุป และไม่รีบขาย' },
];

export const scoreWords = ['', 'ต้องฝึกเพิ่ม', 'พอใช้', 'ดี', 'ดีมาก', 'ยอดเยี่ยม'];

// Quick feedback chips, faster than typing on a phone.
export const strengthTags = [
  'ถามปลายเปิดดี', 'ตั้งใจฟัง', 'ทวนสรุปชัด', 'เชื่อมโยงกับครอบครัว', 'ใช้ตัวเลขประกอบดี', 'น้ำเสียงเป็นมิตร', 'ไม่รีบขาย', 'ลำดับ SPIN ชัด',
];
export const improveTags = [
  'ถาม S นานเกินไป', 'ยังไม่เจอปัญหาจริง', 'ขาด Implication', 'รีบเสนอสินค้า', 'พูดมากกว่าฟัง', 'ควรทวนสรุป', 'ให้ลูกค้าพูดประโยชน์เอง', 'เว้นจังหวะให้คิด',
];

// What the customer can send while the conversation is happening.
export type ReactionKey = 'interested' | 'aha' | 'agree' | 'trust' | 'thinking' | 'worried' | 'bored' | 'pushy';

export const reactions: { key: ReactionKey; emoji: string; label: string; coach: string; tone: 'good' | 'neutral' | 'warn' }[] = [
  { key: 'interested', emoji: '😊', label: 'สนใจ อยากฟังต่อ', coach: 'ลูกค้าเปิดใจ ถามต่อยอดเรื่องนี้ได้เลย', tone: 'good' },
  { key: 'aha', emoji: '💡', label: 'เริ่มเห็นภาพ', coach: 'จังหวะดี ลองชวนคิดถึงผลกระทบ (I) หรือคุณค่า (N)', tone: 'good' },
  { key: 'agree', emoji: '👍', label: 'เห็นด้วย', coach: 'ทวนสรุปสิ่งที่ลูกค้าเห็นด้วย แล้วไปขั้นถัดไป', tone: 'good' },
  { key: 'trust', emoji: '❤️', label: 'รู้สึกถูกรับฟัง', coach: 'รักษาจังหวะนี้ไว้ ฟังมากกว่าพูด', tone: 'good' },
  { key: 'thinking', emoji: '🤔', label: 'ขอคิดก่อน / ยังไม่ชัด', coach: 'ถามให้ง่ายขึ้น หรือยกตัวอย่างใกล้ตัว', tone: 'neutral' },
  { key: 'worried', emoji: '😟', label: 'เริ่มกังวล', coach: 'รับรู้ความรู้สึก แล้วถามว่าห่วงเรื่องไหนที่สุด', tone: 'neutral' },
  { key: 'bored', emoji: '😐', label: 'ไม่ค่อยเกี่ยวกับฉัน', coach: 'กลับไปถาม S/P ให้ตรงชีวิตลูกค้ามากขึ้น', tone: 'warn' },
  { key: 'pushy', emoji: '😣', label: 'รู้สึกโดนขาย', coach: 'หยุดเสนอสินค้า ถอยกลับไปถามปัญหา (P) ก่อน', tone: 'warn' },
];

export const reactionByKey = Object.fromEntries(reactions.map(r => [r.key, r])) as Record<ReactionKey, (typeof reactions)[number]>;

// SHOW TIME (SPIN + Present Solution) adds a sixth criterion to the class feedback.
export const showtimeCriteria: typeof criteria = [
  ...criteria,
  { key: '★', label: 'Present Solution', hint: 'นำเสนอทางออกที่ตรงกับความต้องการที่ลูกค้ายืนยันเอง' },
];

// "กำแพงลูกค้า" from the deck: every customer starts guarded; good questions lower the wall, pushing raises it.
// Worry during Implication is the point of the stage, so it lowers the wall there.
export const wallStart = 80;
export function wallDelta(k: ReactionKey, stage: number) {
  switch (k) {
    case 'trust': return -12;
    case 'aha': return -10;
    case 'interested': return -8;
    case 'agree': return -6;
    case 'worried': return stage === 2 ? -8 : 2;
    case 'thinking': return 2;
    case 'bored': return 8;
    case 'pushy': return 15;
  }
}
export function wallLevel(list: { k: ReactionKey; stage: number }[]) {
  let w = wallStart;
  for (const r of list) w = Math.min(100, Math.max(0, w + wallDelta(r.k, r.stage)));
  return w;
}
export function wallLabel(w: number) {
  if (w <= 20) return { text: 'เปิดใจแล้ว', tone: 'good' as const };
  if (w <= 45) return { text: 'เริ่มเปิดใจ', tone: 'good' as const };
  if (w <= 70) return { text: 'ยังระวังตัว', tone: 'neutral' as const };
  return { text: 'กำแพงสูง', tone: 'warn' as const };
}
