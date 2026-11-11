import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlClass, newClass, points, scoreQuestion, leaderboard, makeBallot, summarizeFeedback, publicState, type QuizActivity, type FeedbackActivity } from '../lib/server/classroom.ts';
import { quizBank } from '../lib/server/quiz-bank.ts';

test('quiz bank is balanced and complete', () => {
  assert.equal(quizBank.length, 20);
  for (const k of ['S', 'P', 'I', 'N']) assert.equal(quizBank.filter(q => q.answer === k).length, 5);
  assert.equal(new Set(quizBank.map(q => q.id)).size, 20);
});

test('faster correct answers score more; wrong scores zero', () => {
  assert.equal(points(true, 0, 20000), 1000);
  assert.equal(points(true, 20000, 20000), 500);
  assert.ok(points(true, 3000, 20000) > points(true, 9000, 20000));
  assert.equal(points(false, 0, 20000), 0);
});

test('quiz flow: setup, hidden answer, scoring, leaderboard, final', () => {
  let s = newClass(0);
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
  s = { ...s, activity: scored };
  s = controlClass(s, { action: 'quiz-final', activityId: scored.id }, 30);
  assert.equal((s.activity as QuizActivity).phase, 'final');
});

test('peer feedback: only while voting, summary averages and tags', () => {
  let s = newClass(0);
  assert.throws(() => controlClass(s, { action: 'feedback-start', advisor: '' }, 1), /ตัวแทน/);
  s = controlClass(s, { action: 'feedback-start', advisor: 'ต้น', customer: 'ฝน', scenario: 4 }, 1);
  const f = s.activity as FeedbackActivity;
  const vote = { activityId: f.id, scores: [5, 4, 3, 4, 5], strengths: ['ตั้งใจฟัง', 'hack'], improves: ['ขาด Implication'], good: 'ถามดี', tip: '' };
  assert.throws(() => makeBallot(f, vote), /ยังไม่เปิด/);
  s = controlClass(s, { action: 'feedback-end', activityId: f.id }, 2);
  const ballot = makeBallot(s.activity as FeedbackActivity, vote);
  assert.deepEqual(ballot.strengths, ['ตั้งใจฟัง']);
  assert.throws(() => makeBallot(s.activity as FeedbackActivity, { ...vote, scores: [6, 4, 3, 4, 4] }), /1–5/);
  const sum = summarizeFeedback([ballot, { ...ballot, scores: [3, 4, 5, 4, 3], strengths: [], good: '', tip: '' }]);
  assert.equal(sum.count, 2); assert.deepEqual(sum.criteria, [4, 4, 4, 4, 4]); assert.equal(sum.overall, 4);
  assert.deepEqual(sum.improves, [{ tag: 'ขาด Implication', count: 2 }]);
  assert.equal(sum.notes.length, 1);
  assert.throws(() => controlClass(s, { action: 'feedback-end', activityId: 'old' }, 3), /ไม่เป็นปัจจุบัน/);
});
