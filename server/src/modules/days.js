// Home screen data for one date, tick/untick, week chart and calendar colours.
import { Router } from 'express';
import { wrap, bad } from '../lib/http.js';
import { today, addDays, weekStart, weekDays, isKey } from '../lib/dates.js';

export function daysModule({ store, progress }) {
  const { sortedRoutine, routineFor, getDay, pctFor, percentOn, budget } = progress;
  const r = Router();

  r.get('/day/:date', wrap(async (req, res) => {
    const { date } = req.params;
    if (!isKey(date)) return bad(res, 'date must be YYYY-MM-DD');
    const [routine, day, todos, weekly, wantToBe] = await Promise.all([
      routineFor(date), getDay(date), store.find('todos', { date }),
      store.findOne('weeklyHabits', { weekStart: weekStart(date) }), store.findOne('wantToBe', { active: true }),
    ]);
    const done = new Set(day.routineDone);
    // A to-do whose parent item doesn't run today is shown as a normal to-do.
    const parentIds = new Set(routine.filter((x) => x.holdsTodos).map((x) => x._id));
    const cleanTodos = todos.map((t) => (t.parentId && !parentIds.has(t.parentId) ? { ...t, parentId: null } : t));
    res.json({
      date,
      routine: routine.map((x) => ({ ...x, done: done.has(x._id) })),
      todos: cleanTodos.sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt),
      weeklyHabit: weekly ? { ...weekly, done: day.weeklyDone } : null,
      wantToBe: wantToBe ? { ...wantToBe, done: day.wantToBeDone } : null,
      percent: pctFor(day, routine),
      totalMinutes: routine.reduce((s, x) => s + x.minutes, 0),
      doneMinutes: routine.filter((x) => done.has(x._id)).reduce((s, x) => s + x.minutes, 0),
      budget: await budget({ routine, todos: cleanTodos, weekly, wantToBe }),
    });
  }));

  // kind: routine (needs id) | weekly | wantToBe
  r.post('/day/:date/toggle', wrap(async (req, res) => {
    const { date } = req.params;
    const { kind, id } = req.body;
    if (!isKey(date)) return bad(res, 'bad date');
    const day = await getDay(date);
    let patch;
    if (kind === 'routine') {
      const set = new Set(day.routineDone);
      set.has(id) ? set.delete(id) : set.add(id);
      patch = { routineDone: [...set] };
    } else if (kind === 'weekly') patch = { weeklyDone: !day.weeklyDone };
    else if (kind === 'wantToBe') patch = { wantToBeDone: !day.wantToBeDone };
    else return bad(res, 'unknown kind');
    res.json(await store.upsert('days', { date }, patch));
  }));

  r.get('/week', wrap(async (req, res) => {
    const start = weekStart(isKey(req.query.date) ? req.query.date : today());
    const all = await sortedRoutine();
    const days = await Promise.all(weekDays(start).map(async (d) => ({ date: d, percent: d > today() ? null : await percentOn(d, all) })));
    res.json({ start, days });
  }));

  // Percent per day for a date range (calendar colours). Max 62 days.
  r.get('/range', wrap(async (req, res) => {
    const { from, to } = req.query;
    if (!isKey(from) || !isKey(to)) return bad(res, 'from/to must be YYYY-MM-DD');
    const all = await sortedRoutine();
    const dates = [];
    for (let d = from; d <= to && dates.length < 62; d = addDays(d, 1)) dates.push(d);
    res.json(await Promise.all(dates.map(async (d) => ({ date: d, percent: d > today() ? null : await percentOn(d, all) }))));
  }));

  // Settings (for now: sleep hours, which sets how many waking hours the day budget has).
  r.get('/settings', wrap(async (req, res) => res.json(await progress.getSettings())));
  r.patch('/settings', wrap(async (req, res) => {
    const sleepHours = Math.min(14, Math.max(4, Number(req.body.sleepHours) || 8));
    res.json(await store.upsert('settings', { _id: 'main' }, { sleepHours }));
  }));

  return r;
}
