const test = require('node:test');
const assert = require('node:assert');
const OT = require('../core.js');
const NOW = new Date(2026, 10, 24, 11, 0); // Tue Nov 24 2026
const ymd = (iso) => { const d = new Date(iso); return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-'); };

test('parses relative and weekday due dates', () => {
  assert.strictEqual(ymd(OT.parseDue('pay bill today', NOW).date), '2026-11-24');
  assert.strictEqual(ymd(OT.parseDue('call mom tomorrow', NOW).date), '2026-11-25');
  assert.strictEqual(ymd(OT.parseDue('essay due fri', NOW).date), '2026-11-27');
  assert.strictEqual(ymd(OT.parseDue('meeting next monday', NOW).date), '2026-11-30');
  assert.strictEqual(ymd(OT.parseDue('call next tue', NOW).date), '2026-12-1');
  assert.strictEqual(ymd(OT.parseDue('exam 11/30', NOW).date), '2026-11-30');
  assert.strictEqual(ymd(OT.parseDue('form 1/5', NOW).date), '2027-1-5');
  assert.strictEqual(OT.parseDue('laundry', NOW), null);
});

test('parses effort estimates and guesses when missing', () => {
  assert.strictEqual(OT.parseMinutes('read ~20m').minutes, 20);
  assert.strictEqual(OT.parseMinutes('study 1.5 hours').minutes, 90);
  assert.strictEqual(OT.parseLine('email TA', NOW).minutes, 10);
  assert.strictEqual(OT.parseLine('write essay', NOW).minutes, 90);
  assert.strictEqual(OT.parseLine('write essay', NOW).estimated, true);
});

test('cleans titles and reads importance and tags', () => {
  const t = OT.parseLine('- finish CS essay due fri ~2h ! #school', NOW);
  assert.strictEqual(t.title, 'Finish CS essay');
  assert.strictEqual(t.important, true);
  assert.deepStrictEqual(t.tags, ['school']);
  assert.strictEqual(t.minutes, 120);
});

test('splits a brain dump and skips blank lines', () => {
  assert.strictEqual(OT.parseBrainDump('a\n\n b \nc; d', NOW).length, 4);
});

test('overdue and due-today tasks beat later ones', () => {
  const tasks = OT.parseBrainDump('read chapter next week\nsubmit form today\nreply to Sam 11/20', NOW);
  const ranked = OT.rankTasks(tasks, { now: NOW, minutes: 25, energy: 'medium' });
  assert.strictEqual(ranked[0].task.title, 'Reply to Sam');
  assert.match(OT.explain(ranked[0]), /overdue/);
  assert.strictEqual(ranked[1].task.title, 'Submit form');
});

test('low energy prefers a quick win when urgency is equal', () => {
  const tasks = OT.parseBrainDump('write lab report tomorrow\npay phone bill tomorrow', NOW);
  assert.strictEqual(OT.pickNext(tasks, { now: NOW, minutes: 25, energy: 'low' }).task.title, 'Pay phone bill');
  assert.strictEqual(OT.pickNext(tasks, { now: NOW, minutes: 90, energy: 'high' }).task.title, 'Write lab report');
});

test('not now and done change the pick', () => {
  const tasks = OT.parseBrainDump('a today\nb today', NOW);
  const ctx = { now: NOW, minutes: 25 };
  assert.strictEqual(OT.pickNext(tasks, ctx).task.title, 'A');
  tasks[0].snoozed = 1;
  assert.strictEqual(OT.pickNext(tasks, ctx).task.title, 'B');
  tasks[1].done = true; tasks[0].done = true;
  assert.strictEqual(OT.pickNext(tasks, ctx), null);
});

test('break down gives concrete steps for known and unknown tasks', () => {
  assert.match(OT.breakDown({ title: 'Write history essay' })[0], /blank doc/);
  assert.match(OT.breakDown({ title: 'Study for calc exam' })[0], /topics/);
  assert.ok(OT.breakDown({ title: 'Plan trip' }).length >= 3);
});
