// Home screen data for one date, tick/untick, week chart and calendar colours.
import { Router } from 'express';
import { wrap, bad } from '../lib/http.js';
import { today, addDays, weekStart, weekDays, isKey } from '../lib/dates.js';

export function daysModule({ store, progress }) {
  const { sortedRoutine, routineFor, getDay, percentOn } = progress;
  const r = Router();

  r.get('/day/:date', wrap(async (req, res) => {
    const { date } = req.params;
    if (!isKey(date)) return bad(res, 'date must be YYYY-MM-DD');
    res.json(await progress.dayView(date));
  }));

  // kind: routine (needs id) | weekly | wantToBe
  //   weekly   → a habit picked from the routine ticks that routine item; an older typed-in one has its own tick
  //   wantToBe → ticks (or unticks) every routine habit of the Becoming that runs on this date
  r.post('/day/:date/toggle', wrap(async (req, res) => {
    const { date } = req.params;
    const { kind, id } = req.body;
    if (!isKey(date)) return bad(res, 'bad date');
    const day = await getDay(date);
    const set = new Set(day.routineDone);
    let patch;
    if (kind === 'routine') {
      set.has(id) ? set.delete(id) : set.add(id);
      patch = { routineDone: [...set] };
    } else if (kind === 'weekly') {
      const weekly = await store.findOne('weeklyHabits', { weekStart: weekStart(date) });
      if (weekly?.routineId) {
        set.has(weekly.routineId) ? set.delete(weekly.routineId) : set.add(weekly.routineId);
        patch = { routineDone: [...set] };
      } else patch = { weeklyDone: !day.weeklyDone };
    } else if (kind === 'wantToBe') {
      const active = await store.findOne('wantToBe', { active: true });
      const habits = active ? (await routineFor(date)).filter((x) => x.wantToBeId === active._id) : [];
      if (habits.length) {
        const allDone = habits.every((h) => set.has(h._id));
        habits.forEach((h) => (allDone ? set.delete(h._id) : set.add(h._id)));
        patch = { routineDone: [...set] };
      } else patch = { wantToBeDone: !day.wantToBeDone };
    } else return bad(res, 'unknown kind');
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
    await store.upsert('settings', { name: 'main' }, { sleepHours });
    res.json(await progress.getSettings());
  }));

  return r;
}
