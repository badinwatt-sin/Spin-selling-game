import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, transition, view, member } from '../lib/server/game.ts';

test('pair flow: roles, card privacy, back-and-forth SPIN, reactions, feedback, role switch', () => {
  let r = createRoom({ name: 'A', scenario: 2, role: 'advisor', duration: 600 }, 0);
  const a = r.players[0].token;
  const joined = transition(r, { action: 'join', name: 'B' }, '', 1);
  r = joined.room; const b = joined.token!;
  assert.throws(() => transition(r, { action: 'join', name: 'C' }, '', 2), /ครบ 2 คน/);
  assert.throws(() => member(r, 'fake', 2));
  assert.equal('persona' in view(r, a, 2), false, 'advisor never sees the card facts');
  assert.ok('lines' in view(r, a, 2), 'advisor gets example lines');
  assert.ok('persona' in view(r, b, 2) && !('lines' in view(r, b, 2)));
  assert.throws(() => transition(r, { action: 'start' }, a, 3), /กดพร้อม/);
  r = transition(r, { action: 'ready' }, b, 4).room;
  assert.throws(() => transition(r, { action: 'start' }, b, 5), /ตัวแทน/);
  r = transition(r, { action: 'start' }, a, 6).room;
  assert.equal(r.phase, 'play'); assert.equal(r.ends, 6 + 600_000);
  r = transition(r, { action: 'stage', stage: 2 }, a, 7).room;
  r = transition(r, { action: 'stage', stage: 1 }, a, 8).room;
  assert.equal(r.stage, 1); assert.equal(r.maxStage, 2);
  assert.throws(() => transition(r, { action: 'stage', stage: 3 }, b, 9), /ตัวแทน/);
  r = transition(r, { action: 'react', kind: 'worried' }, b, 1000).room;
  const same = transition(r, { action: 'react', kind: 'aha' }, b, 1200).room; // throttled
  assert.equal(same.reactions.length, 1);
  r = transition(r, { action: 'react', kind: 'aha' }, b, 2000).room;
  assert.throws(() => transition(r, { action: 'react', kind: 'nope' }, b, 3000));
  assert.equal(view(r, a, 3000).reactions.length, 2);
  r = transition(r, { action: 'finish' }, a, 60_000).room;
  for (const scores of [[0, 5, 5, 5, 5], [5, 5, 5, 5, 6], [1, 2, 3], [2.5, 5, 5, 5, 5]]) {
    assert.throws(() => transition(r, { action: 'feedback', scores }, b, 61_000));
  }
  assert.throws(() => transition(r, { action: 'feedback', scores: [5, 5, 5, 5, 5] }, a, 61_000));
  r = transition(r, { action: 'feedback', scores: [5, 4, 3, 4, 5], comment: ' ดีมาก ' }, b, 62_000).room;
  assert.equal(r.phase, 'report');
  assert.equal(view(r, a, 62_000).reports.length, 1);
  assert.equal(view(r, b, 62_000).reports.length, 0, 'reports go only to the advisor');
  const rep = r.reports[0];
  assert.deepEqual(rep.reactions, { worried: 1, aha: 1 });
  assert.equal(rep.stageReached, 2); assert.equal(rep.comment, 'ดีมาก');
  r = transition(r, { action: 'next' }, b, 63_000).room;
  assert.equal(r.round, 2); assert.equal(r.advisor, 1); assert.notEqual(r.scenario, 2);
  assert.ok('lines' in view(r, b, 63_000), 'roles switched');
});
