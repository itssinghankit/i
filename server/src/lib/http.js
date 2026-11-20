// Small helpers shared by every route file.
export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export const bad = (res, msg) => res.status(400).json({ error: msg });
export const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
