// State for the Learnings feature: categories + learnings, with quick (optimistic) updates.
// Screens and sheets only call these actions; they never talk to the server directly.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { learningsApi } from './api.js';

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0);

export function useLearnings(refreshKey) {
  const [categories, setCategories] = useState(null);
  const [learnings, setLearnings] = useState([]);

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([learningsApi.categories(), learningsApi.all()]);
    setCategories(c.sort(byOrder)); setLearnings(l.sort(byOrder));
  }, []);
  useEffect(() => { load().catch(() => setCategories([])); }, [load, refreshKey]);

  // learnings grouped by category, each group in its saved order
  const byCategory = useMemo(() => {
    const m = new Map((categories || []).map((c) => [c._id, []]));
    learnings.forEach((l) => m.get(l.categoryId)?.push(l));
    m.forEach((list) => list.sort(byOrder));
    return m;
  }, [categories, learnings]);

  const actions = useMemo(() => ({
    addCategory: async (c) => { const row = await learningsApi.createCategory(c); setCategories((x) => [...(x || []), row]); return row; },
    editCategory: async (id, patch) => { setCategories((x) => x.map((c) => (c._id === id ? { ...c, ...patch } : c))); await learningsApi.updateCategory(id, patch); },
    deleteCategory: async (id) => {
      setCategories((x) => x.filter((c) => c._id !== id)); setLearnings((x) => x.filter((l) => l.categoryId !== id));
      await learningsApi.deleteCategory(id);
    },
    reorderCategories: (next) => setCategories(next),
    saveCategoryOrder: (next) => learningsApi.reorderCategories(next.map((c) => c._id)),

    add: async (l) => { const row = await learningsApi.create(l); setLearnings((x) => [...x, row]); return row; },
    edit: async (id, patch) => {
      const moved = patch.categoryId; // moving to another category puts it at the end there
      setLearnings((x) => x.map((l) => (l._id === id ? { ...l, ...patch, ...(moved ? { order: 1e9 } : {}) } : l)));
      await learningsApi.update(id, moved ? { ...patch, order: 1e9 } : patch);
    },
    remove: async (id) => { setLearnings((x) => x.filter((l) => l._id !== id)); await learningsApi.remove(id); },
    // reorder inside one category: update positions on screen now, save when the finger lifts
    reorderIn: (categoryId, next) => setLearnings((x) => {
      const pos = new Map(next.map((l, i) => [l._id, i]));
      return x.map((l) => (l.categoryId === categoryId && pos.has(l._id) ? { ...l, order: pos.get(l._id) } : l));
    }),
    saveOrderIn: (categoryId, next) => learningsApi.reorder(categoryId, next.map((l) => l._id)),
  }), []);

  return { categories, learnings, byCategory, reload: load, ...actions };
}
