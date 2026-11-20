// Habit of the week: one habit per week; when it sticks it can "graduate" into the daily routine.
import { Router } from 'express';
import { wrap, bad } from '../lib/http.js';
import { today, weekStart, weekDays, isKey } from '../lib/dates.js';

export function weeklyHabitsModule({ store, progress }) {
  const r = Router();

  r.get('/', wrap(async (req, res) => {
    const rows = (await store.find('weeklyHabits')).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const habits = await Promise.all(rows.map(async (h) => {
      const days = await Promise.all(weekDays(h.weekStart).map(progress.getDay));
      return { ...h, daysDone: days.filter((d) => d.weeklyDone).length };
    }));
    res.json({ currentWeek: weekStart(today()), habits });
  }));

  r.post('/', wrap(async (req, res) => {
    const { title, emoji = '✨' } = req.body;
    const minutes = Number(req.body.minutes) || 10;
    if (!title?.trim()) return bad(res, 'title is required');
    const ws = weekStart(isKey(req.body.date) ? req.body.date : today());
    res.json(await store.upsert('weeklyHabits', { weekStart: ws }, { title, emoji, minutes, addedToRoutine: false }));
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
