import { Router } from 'express';
import { wrap, bad, pick } from '../lib/http.js';

// Builds list/create/update/delete routes for a simple collection.
//   fields   – which body fields may be saved
//   filters  – which query params can filter the list, with a converter (e.g. Number)
//   onCreate – fill in defaults before saving
//   sort     – order the list
// A new simple feature is usually just one call to this function.
export function crudRouter(store, collection, { fields, filters = {}, onCreate, sort } = {}) {
  const r = Router();
  r.get('/', wrap(async (req, res) => {
    const filter = {};
    for (const [k, conv] of Object.entries(filters)) if (req.query[k] != null) filter[k] = conv(req.query[k]);
    const rows = await store.find(collection, filter);
    res.json(sort ? rows.sort(sort) : rows);
  }));
  r.post('/', wrap(async (req, res) => {
    const doc = pick(req.body, fields);
    if (!doc.title?.trim()) return bad(res, 'title is required');
    if (onCreate) await onCreate(doc);
    res.status(201).json(await store.insert(collection, doc));
  }));
  r.patch('/:id', wrap(async (req, res) => {
    const row = await store.update(collection, { _id: req.params.id }, pick(req.body, fields));
    row ? res.json(row) : res.status(404).json({ error: 'not found' });
  }));
  r.delete('/:id', wrap(async (req, res) => {
    res.json({ removed: await store.remove(collection, { _id: req.params.id }) });
  }));
  return r;
}
