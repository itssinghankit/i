// Refetching on every tab switch would redraw a whole screen each time. keepIfSame keeps the
// current data object when the fresh copy is identical, so React skips the redraw (no lag).
//   api.get('/routine').then(keepIfSame(setItems))
export const keepIfSame = (set) => (next) =>
  set((prev) => (prev !== null && prev !== undefined && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
