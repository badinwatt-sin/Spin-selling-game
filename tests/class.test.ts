import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closeFeedback, controlClass, newClass, points, scoreQuestion, leaderboard, makeBallot, makeNote, summarizeFeedback, publicState, type QuizActivity, type FeedbackActivity, type PostitActivity } from '../lib/server/classroom.ts';
import { quizBank } from '../lib/server/quiz-bank.ts';

test('quiz bank is balanced and complete', () => {
  assert.equal(quizBank.length, 40);
  for (const k of ['S', 'P', 'I', 'N']) assert.equal(quizBank.filter(q => q.answer === k).length, 10);
  assert.equal(new Set(quizBank.map(q => q.id)).size, 40);
  for (const q of quizBank) assert.ok(q.line.length > 10 && q.why.length > 5, `item ${q.id} complete`);
});

test('faster correct answers score more; wrong scores zero', () => {
  assert.equal(points(true, 0, 20000), 1000);
  assert.equal(points(true, 20000, 20000), 500);
  assert.ok(points(true, 3000, 20000) > points(true, 9000, 20000));
  assert.equal(points(false, 0, 20000), 0);
  assert.equal(points(true, 0, 20000, 2000), 2000);
  assert.equal(points(true, 20000, 20000, 100), 50);
  assert.equal(points(true, 15000, 20000, 500, false), 500, 'no speed bonus: always the max');
});

test('quiz flow: setup, hidden answer, scoring, leaderboard, final', () => {
  let s = newClass(0);
  const eight = controlClass(s, { action: 'quiz-setup', count: 8, timeLimit: 20 }, 1).activity as QuizActivity;
  for (const k of ['S', 'P', 'I', 'N']) assert.equal(eight.order.filter(id => quizBank.find(q => q.id === id)!.answer === k).length, 2, 'balanced mix');
  s = controlClass(s, { action: 'quiz-setup', count: 5, timeLimit: 20 }, 1);
  const quiz = s.activity as QuizActivity;
  assert.equal(quiz.order.length, 5);
  assert.throws(() => controlClass(s, { action: 'quiz-final', activityId: quiz.id }, 2));
  s = controlClass(s, { action: 'quiz-open', activityId: quiz.id }, 10);
  const pub = publicState(s, 3, 11) as any;
  assert.equal(pub.activity.reveal, null);
  assert.ok(pub.activity.question.line && !('answer' in pub.activity.question));
  const item = quizBank.find(q => q.id === (s.activity as QuizActivity).order[0])!;
  const wrong = (['S', 'P', 'I', 'N'] as const).find(k => k !== item.answer)!;
  const scored = scoreQuestion(s.activity as QuizActivity, [
    { pid: 'slow', name: 'ช้า', choice: item.answer, ms: 15000 },
    { pid: 'fast', name: 'เร็ว', choice: item.answer, ms: 2000 },
    { pid: 'fast', name: 'เร็ว', choice: wrong, ms: 4000 }, // second tap ignored
    { pid: 'miss', name: 'พลาด', choice: wrong, ms: 1000 },
    { pid: 'late', name: 'สาย', choice: item.answer, ms: 25000 },
  ]);
  assert.equal(scored.phase, 'reveal');
  assert.equal(scored.reveal!.answered, 3);
  assert.equal(scored.reveal!.fastest[0].name, 'เร็ว');
  const board = leaderboard(scored.scores);
  assert.deepEqual(board.map(x => x.pid), ['fast', 'slow', 'miss']);
  assert.equal(board[2].score, 0);
  const flat = scoreQuestion({ ...(s.activity as QuizActivity), maxPoints: 500, speedBonus: false }, [
    { pid: 'a', name: 'A', choice: item.answer, ms: 100 }, { pid: 'b', name: 'B', choice: item.answer, ms: 9000 },
  ]);
  assert.deepEqual(Object.values(flat.scores).map(x => x.score), [500, 500]);
  const custom = controlClass(newClass(0), { action: 'quiz-setup', count: 5, timeLimit: 20, maxPoints: 2000, speedBonus: false }, 1).activity as QuizActivity;
  assert.equal(custom.maxPoints, 2000); assert.equal(custom.speedBonus, false);
  assert.equal((controlClass(newClass(0), { action: 'quiz-setup', count: 5, maxPoints: 777 }, 1).activity as QuizActivity).maxPoints, 1000, 'unknown value falls back to 1000');
  s = { ...s, activity: scored };
  s = controlClass(s, { action: 'quiz-final', activityId: scored.id }, 30);
  assert.equal((s.activity as QuizActivity).phase, 'final');
});

test('peer feedback: only while voting, summary averages and tags', () => {
  let s = newClass(0);
  assert.throws(() => controlClass(s, { action: 'feedback-start', advisor: '' }, 1), /ตัวแทน/);
  s = controlClass(s, { action: 'feedback-start', advisor: 'ต้น', customer: 'ฝน', scenario: 4 }, 1);
  const f = s.activity as FeedbackActivity;
  const vote = { activityId: f.id, scores: [5, 4, 3, 4, 5, 4], strengths: ['ตั้งใจฟัง', 'hack'], improves: ['ขาด Implication'], good: 'ถามดี', tip: '' };
  assert.throws(() => makeBallot(f, vote), /ยังไม่เปิด/);
  s = controlClass(s, { action: 'feedback-end', activityId: f.id }, 2);
  const ballot = makeBallot(s.activity as FeedbackActivity, vote);
  assert.deepEqual(ballot.strengths, ['ตั้งใจฟัง']);
  assert.throws(() => makeBallot(s.activity as FeedbackActivity, { ...vote, scores: [6, 4, 3, 4, 4, 4] }), /1–5/);
  assert.throws(() => makeBallot(s.activity as FeedbackActivity, { ...vote, scores: [5, 4, 3, 4, 5] }), /6 ข้อ/);
  const sum = summarizeFeedback([ballot, { ...ballot, scores: [3, 4, 5, 4, 3, 4], strengths: [], good: '', tip: '' }]);
  assert.equal(sum.count, 2); assert.deepEqual(sum.criteria, [4, 4, 4, 4, 4, 4]); assert.equal(sum.overall, 4);
  const closed = closeFeedback(s, sum);
  assert.equal(closed.showtime!.length, 1); assert.equal(closed.showtime![0].overall, 4);
  assert.equal(closeFeedback(closed, sum).showtime!.length, 1, 're-closing the same pair replaces its result');
  const recap = controlClass(closed, { action: 'recap' }, 5);
  assert.equal(recap.activity!.kind, 'recap');
  assert.deepEqual(sum.improves, [{ tag: 'ขาด Implication', count: 2 }]);
  assert.equal(sum.notes.length, 1);
  assert.throws(() => controlClass(s, { action: 'feedback-end', activityId: 'old' }, 3), /ไม่เป็นปัจจุบัน/);
});

test('post-it: notes hidden until the wall is revealed, stars toggle', () => {
  let s = controlClass(newClass(0), { action: 'postit-start', stage: 'I', minutes: 3, scenario: 1 }, 1000);
  const p = s.activity as PostitActivity;
  assert.equal(p.endsAt, 1000 + 180_000);
  assert.equal(makeNote(p, { activityId: p.id, text: '  ถ้าคุณต้องพักรักษาตัวนาน ใครจะดูแลคุณพ่อคุณแม่ครับ ' }, 2000), 'ถ้าคุณต้องพักรักษาตัวนาน ใครจะดูแลคุณพ่อคุณแม่ครับ');
  assert.throws(() => makeNote(p, { activityId: p.id, text: 'สั้น' }, 2000), /อย่างน้อย/);
  assert.throws(() => makeNote(p, { activityId: p.id, text: 'คำถามที่ส่งช้าเกินไป' }, 1000 + 190_000), /หมดเวลา/);
  const live = [{ pid: 'p1', name: 'ต้น', text: 'คำถามดีมาก', at: 1500 }, { pid: 'p2', name: 'ฝน', text: 'x'.repeat(150), at: 1600 }];
  assert.equal((publicState(s, 2, 2000) as any).activity.notes.length, 0, 'phones get no notes');
  const screen = (publicState(s, 2, 2000, 0, 0, live) as any).activity;
  assert.equal(screen.notes.length, 2, 'screens see notes live while people write'); assert.equal(screen.written, 2);
  s = controlClass(s, { action: 'postit-star', pid: 'p2' }, 2100);
  s = controlClass(s, { action: 'postit-focus', pid: 'p2' }, 2200);
  const starred = (publicState(s, 2, 2300, 0, 0, live) as any).activity;
  assert.deepEqual(starred.notes.map((n: any) => n.star), [false, true], 'can star while writing');
  assert.equal(starred.focus, 'p2');
  s = { ...s, activity: { ...(s.activity as PostitActivity), phase: 'wall', notes: live.map(n => ({ pid: n.pid, name: n.name, text: n.text, star: n.pid === 'p2' })) } };
  s = controlClass(s, { action: 'postit-star', pid: 'p2' }, 3000);
  assert.equal((s.activity as PostitActivity).notes[1].star, false, 'unstar after close');
  s = controlClass(s, { action: 'postit-focus', pid: null }, 3100);
  assert.equal((publicState(s, 2, 3200) as any).activity.focus, null);
});
