// Small, flat payload for the Android home-screen widget.
//   percent     – routine done (Routine tab's bar)
//   todoPercent – to-dos done out of today's to-dos (To-do tab's bar)
//   todos       – the same to-dos Today shows: today's own plus all-time ones still open (or ticked today)
import { Router } from 'express';
import { wrap } from '../lib/http.js';
import { today } from '../lib/dates.js';

export function widgetModule({ progress }) {
  const r = Router();
  r.get('/', wrap(async (req, res) => {
    const date = today();
    const [routine, day, todos] = await Promise.all([progress.routineFor(date), progress.getDay(date), progress.todosFor(date)]);
    const sorted = todos.sort((a, b) => Number(a.done) - Number(b.done) || (a.createdAt || 0) - (b.createdAt || 0));
    res.json({
      date,
      percent: progress.pctFor(day, routine),
      todoPercent: todos.length ? Math.round((todos.filter((t) => t.done).length / todos.length) * 100) : 0,
      routine: routine.map((x) => ({ id: x._id, title: x.title, emoji: x.emoji, minutes: x.minutes, color: x.color, done: day.routineDone.includes(x._id) })),
      todos: sorted.map((x) => ({ id: x._id, title: x.title, minutes: x.minutes || 0, done: !!x.done, kind: x.kind || 'daily' })),
    });
  }));
  return r;
}
