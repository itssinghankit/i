// Today tab rules: Becoming = a category of routine habits, habit of the week picked from the routine,
// time of day on habits and to-dos, all-time vs daily to-dos, "not enough time", and the daily save.
// Dates are built from the server's own today(), so this passes on any day.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'i-today-')), 'db.json');
process.env.SEED_DEMO = 'true';
process.env.CRON_SECRET = 'test-cron-secret';

const { openStore } = await import('../src/db/store.js');
const { seedIfEmpty } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { today, addDays, weekStart } = await import('../src/lib/dates.js');

let server, base, store;
const call = async (method, url, body, headers = {}) => {
  const res = await fetch(base + url, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
const t = today();
const day = async (d = t) => (await call('GET', `/day/${d}`)).body;

before(async () => {
  store = await openStore();
  await seedIfEmpty(store, true);
  server = createApp(store).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => { server.close(); setTimeout(() => process.exit(0), 50); });

test('routine habits get a time of day; a bad time is refused', async () => {
  const r = await call('POST', '/routine', { title: 'Edit footage', minutes: 60, time: '06:30' });
  assert.equal(r.status, 201);
  assert.equal(r.body.time, '06:30');
  assert.equal((await call('PATCH', `/routine/${r.body._id}`, { time: '25:00' })).status, 400);
  assert.equal((await call('PATCH', `/routine/${r.body._id}`, { time: '' })).body.time, null);
  const shown = (await day()).routine.find((x) => x._id === r.body._id);
  assert.ok(shown, 'a new habit runs every day by default');
  await call('DELETE', `/routine/${r.body._id}`);
});

test('Becoming: its routine habits show on Today, and ticking it ticks all of them', async () => {
  const b = (await call('POST', '/wantToBe', { title: 'Travel filmmaker', byYear: 2030, emoji: '🎬' })).body;
  await call('POST', `/wantToBe/${b._id}/activate`);
  const edit = (await call('POST', '/routine', { title: 'Editing', minutes: 60, time: '07:00' })).body;
  const shoot = (await call('POST', '/routine', { title: 'Shooting', minutes: 30 })).body;
  await call('PUT', `/wantToBe/${b._id}/habits`, { ids: [edit._id, shoot._id] });

  let d = await day();
  assert.equal(d.wantToBe.title, 'Travel filmmaker');
  assert.deepEqual(d.wantToBe.habits.map((h) => [h.title, h.minutes, h.time]), [['Editing', 60, '07:00'], ['Shooting', 30, null]]);
  assert.equal(d.wantToBe.done, false);

  await call('POST', `/day/${t}/toggle`, { kind: 'wantToBe' });
  d = await day();
  assert.equal(d.wantToBe.done, true);
  assert.ok(d.routine.find((x) => x._id === edit._id).done && d.routine.find((x) => x._id === shoot._id).done);

  // One habit unticked → the Becoming is not done; ticking it again ticks the rest.
  await call('POST', `/day/${t}/toggle`, { kind: 'routine', id: shoot._id });
  assert.equal((await day()).wantToBe.done, false);
  await call('POST', `/day/${t}/toggle`, { kind: 'wantToBe' });
  assert.equal((await day()).wantToBe.done, true);
  // All done → ticking unticks all.
  await call('POST', `/day/${t}/toggle`, { kind: 'wantToBe' });
  d = await day();
  assert.ok(!d.routine.find((x) => x._id === edit._id).done && !d.routine.find((x) => x._id === shoot._id).done);

  // Habits linked to it aren't counted twice in the day plan (only an older typed-in weekly habit adds time).
  const typedWeekly = d.weeklyHabit && !d.weeklyHabit.routineId ? d.weeklyHabit.minutes : 0;
  assert.equal(d.budget.habitMinutes, typedWeekly);

  // Deleting the Becoming keeps the habits in the routine, unlinked.
  await call('DELETE', `/wantToBe/${b._id}`);
  const after = (await call('GET', '/routine')).body.find((x) => x._id === edit._id);
  assert.equal(after.wantToBeId, null);
  await call('DELETE', `/routine/${edit._id}`); await call('DELETE', `/routine/${shoot._id}`);
});

test('habit of the week is picked from the routine, ticks that item, and can be deleted', async () => {
  const item = (await call('POST', '/routine', { title: 'No screens in bed', minutes: 30, emoji: '📵' })).body;
  assert.equal((await call('POST', '/weeklyHabits', { title: 'typed in' })).status, 400);
  const h = (await call('POST', '/weeklyHabits', { routineId: item._id })).body;
  assert.equal(h.title, 'No screens in bed');

  await call('POST', `/day/${t}/toggle`, { kind: 'weekly' });
  const d = await day();
  assert.equal(d.weeklyHabit.done, true);
  assert.equal(d.routine.find((x) => x._id === item._id).done, true);
  // The weekly habit is a routine item now, so it adds no time of its own (only a typed-in Becoming habit does).
  const typedBecoming = d.wantToBe && !d.wantToBe.linked ? d.wantToBe.minutes || 0 : 0;
  assert.equal(d.budget.habitMinutes, typedBecoming);

  const list = (await call('GET', '/weeklyHabits')).body;
  assert.equal(list.habits.find((x) => x._id === h._id).daysDone, 1);

  assert.equal((await call('DELETE', `/weeklyHabits/${h._id}`)).body.removed, 1);
  assert.equal((await day()).weeklyHabit, null);
  await call('DELETE', `/routine/${item._id}`);
});

test('all-time to-dos show every day until ticked; daily ones only on their date', async () => {
  const always = (await call('POST', '/todos', { title: 'Renew passport', date: t, kind: 'always', minutes: 0 })).body;
  const daily = (await call('POST', '/todos', { title: 'Call mom', date: t, minutes: 0, time: '18:30' })).body;
  assert.equal(daily.kind, 'daily');
  assert.equal(daily.time, '18:30');
  const d1 = addDays(t, 1), d2 = addDays(t, 2);

  const has = async (d, id) => (await day(d)).todos.find((x) => x._id === id);
  assert.ok(await has(t, always._id));
  assert.ok(await has(d2, always._id), 'all-time to-do carries on to later days');
  assert.ok(!(await has(d1, daily._id)), 'daily to-do stays on its own date');
  assert.ok(!(await has(addDays(t, -1), always._id)), 'not before it was made');

  // Ticked tomorrow: shown done tomorrow, not today-undone-forever, gone the day after.
  await call('PATCH', `/todos/${always._id}`, { done: true, doneOn: d1 });
  assert.equal((await has(d1, always._id)).done, true);
  assert.equal((await has(t, always._id)).done, false);
  assert.ok(!(await has(d2, always._id)));

  // Unticking clears doneOn, so it carries on again.
  const un = (await call('PATCH', `/todos/${always._id}`, { done: false })).body;
  assert.equal(un.doneOn, null);
  assert.ok(await has(d2, always._id));
  await call('DELETE', `/todos/${always._id}`); await call('DELETE', `/todos/${daily._id}`);
});

test('a to-do that does not fit the time left is refused, and old ones are greyed out', async () => {
  const huge = await call('POST', '/todos', { title: 'Too big', date: t, minutes: 24 * 60 });
  assert.equal(huge.status, 400);
  assert.match(huge.body.error, /enough time/);

  // Inside a routine item: limited by that item's own time.
  const mon = weekStart(t);
  const office = (await day(mon)).routine.find((x) => x.holdsTodos);
  const inside = await call('POST', '/todos', { title: 'Too long meeting', date: mon, parentId: office._id, minutes: office.minutes + 1 });
  assert.equal(inside.status, 400);
  assert.match(inside.body.error, new RegExp(office.title));
  const fits = await call('POST', '/todos', { title: 'Short call', date: mon, parentId: office._id, minutes: 5 });
  assert.equal(fits.status, 201);

  // A to-do that fitted, then the day got shorter (more sleep) → greyed out (noTime).
  const small = (await call('POST', '/todos', { title: 'Buy milk', date: t, minutes: 10 })).body;
  assert.ok(!(await day()).todos.find((x) => x._id === small._id).noTime);
  await call('PATCH', '/settings', { sleepHours: 14 });
  const d = await day();
  if (d.budget.routineMinutes + 10 > d.budget.awakeMinutes) assert.equal(d.todos.find((x) => x._id === small._id).noTime, true);
  await call('PATCH', '/settings', { sleepHours: 8 });
  await call('DELETE', `/todos/${small._id}`); await call('DELETE', `/todos/${fits.body._id}`);
});

test('taps save only the tick; the nightly job saves the day and fills in missed nights', async () => {
  const first = (await day()).routine[0];
  await call('POST', `/day/${t}/toggle`, { kind: 'routine', id: first._id });
  assert.ok(!(await store.findOne('days', { date: t })).snapshot, 'a tap does not rebuild the day record');
  await call('POST', `/day/${t}/toggle`, { kind: 'routine', id: first._id });

  // Needs the secret.
  assert.equal((await call('GET', '/cron/daily-save')).status, 401);
  const auth = { authorization: 'Bearer test-cron-secret' };

  // Night of day+30: saves it, and fills in the 6 days before it (none have a record yet).
  const night = addDays(t, 30);
  let r = await call('GET', `/cron/daily-save?date=${night}`, null, auth);
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.date, r.body.saved, r.body.filledIn], [night, 1, 6]);
  for (let i = 0; i <= 6; i++) assert.ok((await store.findOne('days', { date: addDays(night, -i) })).snapshot, `day -${i} saved`);

  // Next night: only that day is new; the earlier ones already have a record, so nothing to fill in.
  r = await call('GET', `/cron/daily-save?date=${addDays(night, 1)}`, null, auth);
  assert.deepEqual([r.body.saved, r.body.filledIn], [1, 0]);

  // Job missed 2 nights → the next run fills in both.
  r = await call('GET', `/cron/daily-save?date=${addDays(night, 4)}`, null, auth);
  assert.equal(r.body.filledIn, 2);

  // A day row made by the nightly save still reads as "nothing ticked".
  assert.equal((await day(night)).percent, 0);
});

test('widget: lists all-time to-dos too, and gives the To-do tab its own %', async () => {
  const a = (await call('POST', '/todos', { title: 'Widget all-time', date: addDays(t, -2), kind: 'always', minutes: 0 })).body;
  const b = (await call('POST', '/todos', { title: 'Widget daily', date: t, minutes: 0 })).body;
  let w = (await call('GET', '/widget')).body;
  assert.ok(w.todos.some((x) => x.id === a._id && x.kind === 'always'), 'an all-time to-do from 2 days ago shows today');
  const pct = () => Math.round((w.todos.filter((x) => x.done).length / w.todos.length) * 100);
  assert.equal(w.todoPercent, pct());
  // Ticked from the widget (sends doneOn): counts as done today.
  await call('PATCH', `/todos/${a._id}`, { done: true, doneOn: t });
  w = (await call('GET', '/widget')).body;
  assert.equal(w.todos.find((x) => x.id === a._id).done, true);
  assert.equal(w.todoPercent, pct());
  await call('DELETE', `/todos/${a._id}`); await call('DELETE', `/todos/${b._id}`);
});
