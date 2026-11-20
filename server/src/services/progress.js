// Shared logic about routines and days. Used by home, week chart, calendar, insights and widget.
import { dow, ALL_DAYS } from '../lib/dates.js';

export function progressService(store) {
  const sortedRoutine = async () =>
    (await store.find('routine'))
      .map((r) => ({ ...r, days: r.days?.length ? r.days : ALL_DAYS }))
      .sort((a, b) => a.order - b.order);

  // Only the items that run on this date's weekday (e.g. a different routine on Sat/Sun).
  const routineFor = async (date, all) => {
    const d = dow(date);
    return (all || (await sortedRoutine())).filter((r) => r.days.includes(d));
  };

  const getDay = async (date) =>
    (await store.findOne('days', { date })) || { date, routineDone: [], weeklyDone: false, wantToBeDone: false };

  const pctFor = (day, routine) => {
    if (!routine.length) return 0;
    const ids = new Set(routine.map((r) => r._id));
    return Math.round((day.routineDone.filter((id) => ids.has(id)).length / routine.length) * 100);
  };

  // Percent for a date, using that date's own routine.
  const percentOn = async (date, all) => pctFor(await getDay(date), await routineFor(date, all));

  const getSettings = async () => ({ sleepHours: 8, ...(await store.findOne('settings', { _id: 'main' })) });

  // Does everything planned for the day fit in the waking hours?
  // To-dos that sit under a routine item (e.g. Office work) don't add time: that item's time already covers them.
  const budget = async ({ routine, todos, weekly, wantToBe }) => {
    const { sleepHours } = await getSettings();
    const routineMinutes = routine.reduce((s, r) => s + (Number(r.minutes) || 0), 0);
    const habitMinutes = (Number(weekly?.minutes) || 0) + (Number(wantToBe?.minutes) || 0);
    const todoMinutes = todos.filter((t) => !t.parentId).reduce((s, t) => s + (Number(t.minutes) || 0), 0);
    const plannedMinutes = routineMinutes + habitMinutes + todoMinutes;
    const awakeMinutes = Math.round((24 - sleepHours) * 60);
    return { routineMinutes, habitMinutes, todoMinutes, plannedMinutes, awakeMinutes, sleepHours, freeMinutes: awakeMinutes - plannedMinutes, fits: plannedMinutes <= awakeMinutes };
  };

  return { sortedRoutine, routineFor, getDay, pctFor, percentOn, getSettings, budget };
}
