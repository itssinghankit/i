// Makes every read and write belong to the signed-in person.
// The auth middleware runs each request inside userContext.run({ userId }, ...).
// This wrapper then adds { userId } to every filter and every new document, so feature code
// (modules/*.js) never has to think about users and can never see someone else's data.
// With sign-in turned off (local demo) there is no userId and nothing is filtered.
import { AsyncLocalStorage } from 'node:async_hooks';
import { COLLECTIONS } from './store.js';

export const userContext = new AsyncLocalStorage();
const PER_USER = new Set(COLLECTIONS);

export function scopedStore(base) {
  const uid = () => userContext.getStore()?.userId;
  const scoped = (name) => PER_USER.has(name) && !!uid();
  const f = (name, filter = {}) => (scoped(name) ? { ...filter, userId: uid() } : filter);
  // Never let a patch move a row to another user.
  const clean = (patch) => { const { userId, _id, ...rest } = patch; return rest; };

  return {
    base,
    kind: () => base.kind(),
    find: (n, flt) => base.find(n, f(n, flt)),
    findOne: (n, flt) => base.findOne(n, f(n, flt)),
    insert: (n, doc) => base.insert(n, scoped(n) ? { ...doc, userId: uid() } : doc),
    update: (n, flt, p) => base.update(n, f(n, flt), scoped(n) ? clean(p) : p),
    updateMany: (n, flt, p) => base.updateMany(n, f(n, flt), scoped(n) ? clean(p) : p),
    upsert: (n, flt, p) => base.upsert(n, f(n, flt), scoped(n) ? clean(p) : p),
    remove: (n, flt) => base.remove(n, f(n, flt)),
    count: (n, flt) => base.count(n, f(n, flt)),
    // Signed in: clears only this person's data. Signed out (local demo): clears everything.
    wipe: async () => {
      if (!uid()) return base.wipe();
      for (const n of COLLECTIONS) await base.remove(n, { userId: uid() });
    },
  };
}
