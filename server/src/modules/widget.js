// Small, flat payload for the Android home-screen widget.
import { Router } from 'express';
import { wrap } from '../lib/http.js';
import { today } from '../lib/dates.js';

export function widgetModule({ store, progress }) {
  const r = Router();
  r.get('/', wrap(async (req, res) => {
    const date = today();
    const [routine, day, todos] = await Promise.all([progress.routineFor(date), progress.getDay(date), store.find('todos', { date })]);
    res.json({
      date,
      percent: progress.pctFor(day, routine),
      routine: routine.map((x) => ({ id: x._id, title: x.title, emoji: x.emoji, minutes: x.minutes, done: day.routineDone.includes(x._id) })),
      todos: todos.map((x) => ({ id: x._id, title: x.title, done: x.done })),
    });
  }));
  return r;
}
