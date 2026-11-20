// Learnings: things you've learned, grouped into your own categories (e.g. Life, Communication).
//   /learnCategories           list / create / rename / delete (deleting also removes its learnings)
//   /learnCategories/reorder   { ids }   order of the categories
//   /learnings                 list / create / update / delete; each has title, description, categoryId
//   /learnings/reorder         { categoryId, ids }   order of the learnings inside one category
import { Router } from 'express';
import { crudRouter } from './crud.js';
import { wrap, bad } from '../lib/http.js';
import { today } from '../lib/dates.js';

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0);

// Saves a new order: position in `ids` becomes `order`. Only rows matching `scope` are touched.
async function saveOrder(store, collection, ids, scope = {}) {
  await Promise.all(ids.map((id, order) => store.update(collection, { _id: id, ...scope }, { order })));
}

export function learnCategoriesModule({ store }) {
  const r = Router();
  r.post('/reorder', wrap(async (req, res) => {
    if (!Array.isArray(req.body?.ids)) return bad(res, 'ids must be a list');
    await saveOrder(store, 'learnCategories', req.body.ids);
    res.json((await store.find('learnCategories')).sort(byOrder));
  }));
  // Deleting a category deletes the learnings inside it too.
  r.delete('/:id', wrap(async (req, res) => {
    const removedLearnings = await store.remove('learnings', { categoryId: req.params.id });
    res.json({ removed: await store.remove('learnCategories', { _id: req.params.id }), removedLearnings });
  }));
  r.use(crudRouter(store, 'learnCategories', {
    fields: ['title', 'emoji', 'color', 'order'],
    sort: byOrder,
    onCreate: async (doc) => { doc.order ??= await store.count('learnCategories'); doc.createdAt = Date.now(); },
  }));
  return r;
}

export function learningsModule({ store }) {
  const r = Router();
  r.post('/reorder', wrap(async (req, res) => {
    const { categoryId, ids } = req.body || {};
    if (!categoryId || !Array.isArray(ids)) return bad(res, 'categoryId and ids are required');
    await saveOrder(store, 'learnings', ids, { categoryId }); // can't move rows out of their category this way
    res.json((await store.find('learnings', { categoryId })).sort(byOrder));
  }));
  r.use(crudRouter(store, 'learnings', {
    fields: ['title', 'description', 'categoryId', 'order'],
    filters: { categoryId: String },
    sort: byOrder,
    onCreate: async (doc) => {
      if (!doc.categoryId) throw Object.assign(new Error('categoryId is required'), { status: 400 });
      const cat = await store.findOne('learnCategories', { _id: doc.categoryId });
      if (!cat) throw Object.assign(new Error('category not found'), { status: 400 });
      doc.description = (doc.description || '').slice(0, 5000);
      doc.date = today();
      doc.createdAt = Date.now();
      doc.order ??= await store.count('learnings', { categoryId: doc.categoryId });
    },
  }));
  return r;
}
