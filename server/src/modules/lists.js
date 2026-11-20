// Simple lists that only need create / read / update / delete.
import { Router } from 'express';
import { crudRouter } from './crud.js';
import { wrap } from '../lib/http.js';
import { today } from '../lib/dates.js';

const refuse = (msg) => { throw Object.assign(new Error(msg), { status: 400 }); };
// Optional time of day, "HH:MM" (24-hour). Empty clears it.
const cleanTime = (doc) => {
  if (doc.time === undefined) return;
  if (doc.time === '' || doc.time === null) { doc.time = null; return; }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(doc.time)) refuse('time must be HH:MM');
};

// To-dos. kind: 'daily' (default, only on its date) or 'always' (all-time: shows every day until ticked).
// doneOn: the date an all-time to-do was ticked. A new to-do that doesn't fit the time left is refused.
export function todosModule({ store, progress }) {
  return crudRouter(store, 'todos', {
    fields: ['title', 'date', 'done', 'doneOn', 'parentId', 'minutes', 'time', 'kind'],
    filters: { date: String },
    prepare: (doc) => {
      cleanTime(doc);
      if (doc.kind !== undefined && !['daily', 'always'].includes(doc.kind)) refuse('kind must be daily or always');
      if (doc.minutes !== undefined) doc.minutes = Math.max(0, Math.min(24 * 60, Number(doc.minutes) || 0));
      if (doc.done === false) doc.doneOn = null;
    },
    onCreate: async (doc) => {
      doc.date ||= today(); doc.done = false; doc.createdAt = Date.now(); doc.kind ||= 'daily';
      const m = Number(doc.minutes) || 0;
      if (!m) return;
      const view = await progress.dayView(doc.date);
      const parent = doc.parentId && view.routine.find((r) => r._id === doc.parentId && r.holdsTodos);
      const left = parent
        ? (Number(parent.minutes) || 0) - view.todos.filter((t) => t.parentId === parent._id).reduce((s, t) => s + (Number(t.minutes) || 0), 0)
        : view.budget.freeMinutes;
      if (m > left) refuse(parent ? `You don't have enough time for this: ${parent.title} has ${Math.max(0, left)} min left` : `You don't have enough time for this: ${Math.max(0, left)} min free today`);
    },
  });
}

export function resolutionsModule({ store }) {
  return crudRouter(store, 'resolutions', { fields: ['year', 'title', 'emoji', 'done'], filters: { year: Number } });
}

export function needsWantsModule({ store }) {
  return crudRouter(store, 'needsWants', { fields: ['type', 'title', 'note', 'price', 'done'], filters: { type: String } });
}

export function routineModule({ store, progress }) {
  const r = Router();
  r.post('/reorder', wrap(async (req, res) => {
    const ids = req.body.ids || [];
    await Promise.all(ids.map((id, order) => store.update('routine', { _id: id }, { order })));
    res.json(await progress.sortedRoutine());
  }));
  r.use(crudRouter(store, 'routine', {
    // time: optional time of day ("HH:MM"). wantToBeId: the Becoming this habit belongs to (or null).
    fields: ['title', 'minutes', 'emoji', 'color', 'order', 'days', 'holdsTodos', 'time', 'wantToBeId'],
    prepare: cleanTime,
    sort: (a, b) => a.order - b.order,
    onCreate: async (doc) => { doc.order ??= await store.count('routine'); },
  }));
  return r;
}

// "Who I want to be" (Becoming). Each one is a category of routine habits: the routine items with
// wantToBeId = its id. Exactly one is active; it shows on Today. The choice is saved in the database.
export function wantToBeModule({ store }) {
  const r = Router();
  r.post('/:id/activate', wrap(async (req, res) => {
    await store.updateMany('wantToBe', {}, { active: false });
    res.json(await store.update('wantToBe', { _id: req.params.id }, { active: true }));
  }));
  // { ids }: exactly these routine items belong to this Becoming (a habit belongs to one Becoming at most).
  r.put('/:id/habits', wrap(async (req, res) => {
    const id = req.params.id;
    if (!(await store.findOne('wantToBe', { _id: id }))) return res.status(404).json({ error: 'not found' });
    const ids = new Set(Array.isArray(req.body?.ids) ? req.body.ids : []);
    const routine = await store.find('routine');
    await Promise.all(routine.map((x) => {
      if (ids.has(x._id) && x.wantToBeId !== id) return store.update('routine', { _id: x._id }, { wantToBeId: id });
      if (!ids.has(x._id) && x.wantToBeId === id) return store.update('routine', { _id: x._id }, { wantToBeId: null });
      return null;
    }));
    res.json({ ids: [...ids] });
  }));
  // Deleting a Becoming keeps its habits in the routine, just no longer linked.
  r.delete('/:id', wrap(async (req, res) => {
    await store.updateMany('routine', { wantToBeId: req.params.id }, { wantToBeId: null });
    const removed = await store.remove('wantToBe', { _id: req.params.id });
    // Keep one active if any are left.
    if (!(await store.findOne('wantToBe', { active: true }))) {
      const next = (await store.find('wantToBe'))[0];
      if (next) await store.update('wantToBe', { _id: next._id }, { active: true });
    }
    res.json({ removed });
  }));
  r.use(crudRouter(store, 'wantToBe', {
    fields: ['title', 'byYear', 'habit', 'emoji', 'minutes'],
    onCreate: async (doc) => { doc.active = (await store.count('wantToBe')) === 0; },
  }));
  return r;
}
