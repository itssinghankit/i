// Sign-in tests. Google is replaced by a fake checker, so no network or real accounts are needed.
// Runs on the local file store, or MongoDB when MONGODB_URI is set.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

if (!process.env.MONGODB_URI) process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'i-auth-')), 'db.json');
process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.SEED_DEMO = 'true';
process.env.ALLOW_RESET = 'true';
process.env.CRON_SECRET = 'test-cron-secret';

const { openStore } = await import('../src/db/store.js');
const { seedIfEmpty } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { today } = await import('../src/lib/dates.js');

// Fake Google: the "credential" is just the person's name.
const people = {
  owner: { sub: 'g-owner', email: 'owner@example.com', name: 'Owner' },
  friend: { sub: 'g-friend', email: 'friend@example.com', name: 'Friend' },
};
const verifyGoogleToken = async (cred) => { if (!people[cred]) throw new Error('bad token'); return people[cred]; };

let server, base, store;
const call = async (method, url, body, token) => {
  const headers = { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(base + url, { method, headers, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
const signIn = async (who) => (await call('POST', '/auth/google', { credential: who })).body;

before(async () => {
  store = await openStore();
  await store.wipe();
  await store.remove('users', {});
  await seedIfEmpty(store, true); // demo data with no owner yet, like data saved before sign-in existed
  server = createApp(store, { verifyGoogleToken }).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => { server.close(); setTimeout(() => process.exit(0), 50); });

test('config says sign-in is on', async () => {
  const r = await call('GET', '/auth/config');
  assert.deepEqual(r.body, { required: true, googleClientId: 'test-client.apps.googleusercontent.com' });
});

test('data needs a token', async () => {
  assert.equal((await call('GET', `/day/${today()}`)).status, 401);
  assert.equal((await call('GET', `/day/${today()}`, null, 'v1.forged.token')).status, 401);
});

test('a bad Google token is refused', async () => {
  assert.equal((await call('POST', '/auth/google', { credential: 'stranger' })).status, 401);
});

test('first person to sign in gets the existing data', async () => {
  const { token, user } = await signIn('owner');
  assert.equal(user.email, 'owner@example.com');
  const day = (await call('GET', `/day/${today()}`, null, token)).body;
  assert.ok(day.routine.length > 0, 'owner should see the old routine');
  assert.equal((await call('GET', '/auth/me', null, token)).body.name, 'Owner');
});

test('a second person starts empty and cannot see or change the first one', async () => {
  const owner = (await signIn('owner')).token;
  const friend = (await signIn('friend')).token;
  const d = today();

  assert.equal((await call('GET', `/day/${d}`, null, friend)).body.routine.length, 0);

  const mine = (await call('POST', '/todos', { title: 'friend only', date: d }, friend)).body;
  const ownerTodos = (await call('GET', `/day/${d}`, null, owner)).body.todos.map((t) => t.title);
  assert.ok(!ownerTodos.includes('friend only'));

  // Owner tries to edit and delete the friend's to-do by id: nothing happens.
  assert.equal((await call('PATCH', `/todos/${mine._id}`, { done: true }, owner)).status, 404);
  assert.equal((await call('DELETE', `/todos/${mine._id}`, null, owner)).body.removed, 0);
  const still = (await call('GET', `/day/${d}`, null, friend)).body.todos.find((t) => t._id === mine._id);
  assert.equal(still.done, false);
});

test('same date, two people: each has their own ticks and settings', async () => {
  const owner = (await signIn('owner')).token;
  const friend = (await signIn('friend')).token;
  const r = (await call('POST', '/routine', { title: 'Friend walk', minutes: 20 }, friend)).body;
  await call('POST', `/day/${today()}/toggle`, { kind: 'routine', id: r._id }, friend);
  await call('PATCH', '/settings', { sleepHours: 6 }, friend);
  assert.equal((await call('GET', '/settings', null, friend)).body.sleepHours, 6);
  assert.notEqual((await call('GET', '/settings', null, owner)).body.sleepHours, 6);
  assert.equal((await call('GET', `/day/${today()}`, null, friend)).body.percent, 100);
});

test('a patch cannot move a row to another user', async () => {
  const owner = (await signIn('owner')).token;
  const t = (await call('POST', '/todos', { title: 'mine', date: today() }, owner)).body;
  await call('PATCH', `/todos/${t._id}`, { userId: 'someone-else', title: 'still mine' }, owner);
  const after = (await call('GET', `/day/${today()}`, null, owner)).body.todos.find((x) => x._id === t._id);
  assert.equal(after.title, 'still mine');
});

test('widget works with a token', async () => {
  const owner = (await signIn('owner')).token;
  assert.equal((await call('GET', '/widget', null, owner)).status, 200);
  assert.equal((await call('GET', '/widget')).status, 401);
});

test('nightly save runs for every signed-in person, each with only their own data', async () => {
  const owner = await signIn('owner');
  const friend = await signIn('friend');
  // The friend has one routine habit of their own; the owner has the demo routine.
  await call('POST', '/routine', { title: 'Friend habit', minutes: 10 }, friend.token);
  const night = today();
  const r = await fetch(`${base}/cron/daily-save?date=${night}`, { headers: { authorization: 'Bearer test-cron-secret' } }).then((x) => x.json());
  assert.equal(r.users, 2);
  assert.equal(r.failed, 0);
  const rows = await store.find('days', { date: night });
  const of = (u) => rows.find((x) => x.userId === u.user.id)?.snapshot;
  const ownerTitles = of(owner).routine.map((x) => x.title);
  const friendTitles = of(friend).routine.map((x) => x.title);
  assert.ok(friendTitles.includes('Friend habit'));
  assert.ok(!ownerTitles.includes('Friend habit'), "the owner's record has none of the friend's habits");
  assert.ok(!friendTitles.some((x) => ownerTitles.includes(x)), "the friend's record has none of the owner's habits");
  // Without the secret: refused, even for a signed-in person.
  assert.equal((await call('GET', '/cron/daily-save', null, owner.token)).status, 401);
});
