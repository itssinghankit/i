// Learnings: categories, notes inside them, order within a category, and privacy between users.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

if (!process.env.MONGODB_URI) process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'i-learn-')), 'db.json');
process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
process.env.SESSION_SECRET = 'y'.repeat(40);

const { openStore } = await import('../src/db/store.js');
const { createApp } = await import('../src/app.js');
const { today } = await import('../src/lib/dates.js');

const people = { a: { sub: 'g-a', email: 'a@example.com', name: 'A' }, b: { sub: 'g-b', email: 'b@example.com', name: 'B' } };
let server, base, A, B;
const call = async (method, url, body, token) => {
  const res = await fetch(base + url, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  const store = await openStore();
  await store.wipe(); await store.remove('users', {});
  server = createApp(store, { verifyGoogleToken: async (c) => people[c] }).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  A = (await call('POST', '/auth/google', { credential: 'a' })).body.token;
  B = (await call('POST', '/auth/google', { credential: 'b' })).body.token;
});
after(() => { server.close(); setTimeout(() => process.exit(0), 50); });

test('create categories and learnings; date and order are filled in', async () => {
  const life = (await call('POST', '/learnCategories', { title: 'Life', emoji: '🌱' }, A)).body;
  const comm = (await call('POST', '/learnCategories', { title: 'Communication', emoji: '🗣️' }, A)).body;
  assert.equal(life.order, 0); assert.equal(comm.order, 1);
  const l1 = (await call('POST', '/learnings', { title: 'One', description: 'first', categoryId: life._id }, A)).body;
  const l2 = (await call('POST', '/learnings', { title: 'Two', description: 'second', categoryId: life._id }, A)).body;
  const c1 = (await call('POST', '/learnings', { title: 'Talk', categoryId: comm._id }, A)).body;
  assert.equal(l1.date, today()); assert.equal(l1.order, 0); assert.equal(l2.order, 1); assert.equal(c1.order, 0);
});

test('a learning needs an existing category', async () => {
  assert.equal((await call('POST', '/learnings', { title: 'x' }, A)).status, 400);
  assert.equal((await call('POST', '/learnings', { title: 'x', categoryId: 'nope' }, A)).status, 400);
});

test('reorder learnings inside one category', async () => {
  const life = (await call('GET', '/learnCategories', null, A)).body.find((c) => c.title === 'Life');
  const list = (await call('GET', `/learnings?categoryId=${life._id}`, null, A)).body;
  assert.deepEqual(list.map((l) => l.title), ['One', 'Two']);
  const after = (await call('POST', '/learnings/reorder', { categoryId: life._id, ids: list.map((l) => l._id).reverse() }, A)).body;
  assert.deepEqual(after.map((l) => l.title), ['Two', 'One']);
});

test('reorder categories', async () => {
  const cats = (await call('GET', '/learnCategories', null, A)).body;
  const after = (await call('POST', '/learnCategories/reorder', { ids: cats.map((c) => c._id).reverse() }, A)).body;
  assert.deepEqual(after.map((c) => c.title), ['Communication', 'Life']);
});

test('another user cannot see or reorder my learnings', async () => {
  assert.equal((await call('GET', '/learnCategories', null, B)).body.length, 0);
  assert.equal((await call('GET', '/learnings', null, B)).body.length, 0);
  const life = (await call('GET', '/learnCategories', null, A)).body.find((c) => c.title === 'Life');
  const ids = (await call('GET', `/learnings?categoryId=${life._id}`, null, A)).body.map((l) => l._id);
  await call('POST', '/learnings/reorder', { categoryId: life._id, ids: [...ids].reverse() }, B);
  assert.deepEqual((await call('GET', `/learnings?categoryId=${life._id}`, null, A)).body.map((l) => l.title), ['Two', 'One']);
});

test('deleting a category deletes its learnings', async () => {
  const comm = (await call('GET', '/learnCategories', null, A)).body.find((c) => c.title === 'Communication');
  const r = (await call('DELETE', `/learnCategories/${comm._id}`, null, A)).body;
  assert.equal(r.removed, 1); assert.equal(r.removedLearnings, 1);
  assert.equal((await call('GET', `/learnings?categoryId=${comm._id}`, null, A)).body.length, 0);
});
