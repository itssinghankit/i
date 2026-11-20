// Simple lists that only need create / read / update / delete.
import { Router } from 'express';
import { crudRouter } from './crud.js';
import { wrap } from '../lib/http.js';
import { today } from '../lib/dates.js';

export function todosModule({ store }) {
  return crudRouter(store, 'todos', {
    fields: ['title', 'date', 'done', 'parentId', 'minutes'],
    filters: { date: String },
    onCreate: (doc) => { doc.date ||= today(); doc.done = false; doc.createdAt = Date.now(); },
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
    fields: ['title', 'minutes', 'emoji', 'color', 'order', 'days', 'holdsTodos'],
    sort: (a, b) => a.order - b.order,
    onCreate: async (doc) => { doc.order ??= await store.count('routine'); },
  }));
  return r;
}

// "Who I want to be". Exactly one is active; it shows on Home. The choice is saved in the database.
export function wantToBeModule({ store }) {
  const r = Router();
  r.post('/:id/activate', wrap(async (req, res) => {
    await store.updateMany('wantToBe', {}, { active: false });
    res.json(await store.update('wantToBe', { _id: req.params.id }, { active: true }));
  }));
  r.use(crudRouter(store, 'wantToBe', {
    fields: ['title', 'byYear', 'habit', 'emoji', 'minutes'],
    onCreate: async (doc) => { doc.active = (await store.count('wantToBe')) === 0; },
  }));
  return r;
}
