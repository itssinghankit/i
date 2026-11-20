// Habit of the week: one habit per week, picked from your routine (routineId). Ticking it ticks that routine item.
// Older weeks may hold a typed-in habit (no routineId); those can still "graduate" into the routine.
import { Router } from 'express';
import { wrap, bad } from '../lib/http.js';
import { today, weekStart, weekDays, isKey } from '../lib/dates.js';

export function weeklyHabitsModule({ store, progress }) {
  const r = Router();

  r.get('/', wrap(async (req, res) => {
    const rows = (await store.find('weeklyHabits')).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const habits = await Promise.all(rows.map(async (h) => {
      const days = await Promise.all(weekDays(h.weekStart).map(progress.getDay));
      return { ...h, daysDone: days.filter((d) => progress.weeklyDoneOn(h, d)).length };
    }));
    res.json({ currentWeek: weekStart(today()), habits });
  }));

  // { routineId, date? }: this week's habit is that routine item.
  r.post('/', wrap(async (req, res) => {
    const item = req.body.routineId && (await store.findOne('routine', { _id: req.body.routineId }));
    if (!item) return bad(res, 'pick a habit from your routine');
    const ws = weekStart(isKey(req.body.date) ? req.body.date : today());
    res.json(await store.upsert('weeklyHabits', { weekStart: ws },
      { routineId: item._id, title: item.title, emoji: item.emoji, minutes: Number(item.minutes) || 0, addedToRoutine: true }));
  }));

  // Remove a week's habit (the routine item itself stays).
  r.delete('/:id', wrap(async (req, res) => {
    res.json({ removed: await store.remove('weeklyHabits', { _id: req.params.id }) });
  }));

  r.post('/:id/graduate', wrap(async (req, res) => {
    const h = await store.findOne('weeklyHabits', { _id: req.params.id });
    if (!h) return res.status(404).json({ error: 'not found' });
    const item = await store.insert('routine', {
      title: h.title, emoji: h.emoji, minutes: Number(req.body.minutes) || h.minutes || 10,
      color: '#8b5cf6', order: await store.count('routine'),
    });
    await store.update('weeklyHabits', { _id: h._id }, { addedToRoutine: true });
    res.json(item);
  }));

  return r;
}
