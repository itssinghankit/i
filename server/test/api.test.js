// End-to-end API test. Runs against the local file store by default,
// or against MongoDB when MONGODB_URI is set (CI / before a deploy).
// Dates are built from the server's own today(), so this passes on any day.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

if (!process.env.MONGODB_URI) process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'i-test-')), 'db.json');
process.env.SEED_DEMO = 'true';
process.env.ALLOW_RESET = 'true';

const { openStore } = await import('../src/db/store.js');
const { seedIfEmpty } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { today, addDays, dow, weekStart } = await import('../src/lib/dates.js');

let server, base;
const call = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  const store = await openStore();
  await seedIfEmpty(store, true);
  server = createApp(store).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => { server.close(); setTimeout(() => process.exit(0), 50); });

test('health', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.store, process.env.MONGODB_URI ? 'mongodb' : 'file');
});

test('weekday vs weekend routine', async () => {
  const t = today();
  const sat = addDays(weekStart(t), 5), mon = weekStart(t);
  const s = (await call('GET', `/day/${sat}`)).body;
  const m = (await call('GET', `/day/${mon}`)).body;
  assert.ok(s.routine.some((r) => r.title === 'Long run'));
  assert.ok(!s.routine.some((r) => r.title === 'Office work'));
  assert.ok(m.routine.some((r) => r.title === 'Office work'));
  assert.equal(dow(sat), 5);
});

test('tick a routine item and the percent changes', async () => {
  const d = addDays(today(), 3);
  const before = (await call('GET', `/day/${d}`)).body;
  const item = before.routine[0];
  await call('POST', `/day/${d}/toggle`, { kind: 'routine', id: item._id });
  const after = (await call('GET', `/day/${d}`)).body;
  assert.equal(after.routine[0].done, !item.done);
  assert.notEqual(after.percent, before.percent);
});

test('to-do inside Office work adds no time; standalone does', async () => {
  const d = weekStart(today()); // a Monday, so Office work runs
  const day = (await call('GET', `/day/${d}`)).body;
  const office = day.routine.find((r) => r.holdsTodos);
  const b0 = day.budget.plannedMinutes;
  await call('POST', '/todos', { title: 'inside', date: d, parentId: office._id, minutes: 0 });
  assert.equal((await call('GET', `/day/${d}`)).body.budget.plannedMinutes, b0);
  await call('POST', '/todos', { title: 'standalone', date: d, minutes: 25 });
  assert.equal((await call('GET', `/day/${d}`)).body.budget.plannedMinutes, b0 + 25);
});

test('settings save (upsert with a fixed _id)', async () => {
  await call('PATCH', '/settings', { sleepHours: 7.5 });
  assert.equal((await call('GET', '/settings')).body.sleepHours, 7.5);
  await call('PATCH', '/settings', { sleepHours: 8 });
  assert.equal((await call('GET', '/settings')).body.sleepHours, 8);
});

test('want-to-be: switching the active one is saved', async () => {
  const list = (await call('GET', '/wantToBe')).body;
  const other = list.find((x) => !x.active);
  await call('POST', `/wantToBe/${other._id}/activate`);
  const day = (await call('GET', `/day/${today()}`)).body;
  assert.equal(day.wantToBe._id, other._id);
});

test('custom routine time and weekday choice round-trip', async () => {
  const r = (await call('POST', '/routine', { title: 'Guitar', minutes: 80, days: [5, 6], emoji: '🎸', color: '#7c3aed' })).body;
  assert.equal(r.minutes, 80);
  assert.deepEqual(r.days, [5, 6]);
});

test('week chart, insights, widget, calendar', async () => {
  for (const p of ['/week', '/insights', '/widget', `/range?from=${addDays(today(), -6)}&to=${today()}`, '/weeklyHabits']) {
    assert.equal((await call('GET', p)).status, 200, p);
  }
});
