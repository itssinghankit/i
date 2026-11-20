// Shared logic about routines and days. Used by home, week chart, calendar, insights, widget
// and the nightly save (every day's full record is kept in its `days` row as `snapshot`).
import { dow, ALL_DAYS, weekStart, addDays } from '../lib/dates.js';

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

  // A day row can exist with only its saved snapshot (the nightly save), so fill in the ticks.
  const getDay = async (date) =>
    ({ routineDone: [], weeklyDone: false, wantToBeDone: false, ...(await store.findOne('days', { date })), date });

  const pctFor = (day, routine) => {
    if (!routine.length) return 0;
    const ids = new Set(routine.map((r) => r._id));
    return Math.round((day.routineDone.filter((id) => ids.has(id)).length / routine.length) * 100);
  };

  // Percent for a date, using that date's own routine.
  const percentOn = async (date, all) => pctFor(await getDay(date), await routineFor(date, all));

  // Habit of the week done on a day? A habit picked from the routine is done when that routine item is ticked.
  // Older habits (typed in, not from the routine) have their own tick (weeklyDone).
  const weeklyDoneOn = (habit, day) => (habit?.routineId ? day.routineDone.includes(habit.routineId) : !!day.weeklyDone);

  // One settings row per person (name 'main'); older single-user data used _id 'main'.
  const getSettings = async () => {
    const row = (await store.findOne('settings', { name: 'main' })) || (await store.findOne('settings', { _id: 'main' }));
    return { sleepHours: row?.sleepHours ?? 8 };
  };

  // Does everything planned for the day fit in the waking hours?
  // To-dos that sit under a routine item (e.g. Office work) don't add time: that item's time already covers them.
  // habitMinutes: only habits that are NOT routine items (routine items are already counted).
  const budget = async ({ routine, todos, habitMinutes = 0 }) => {
    const { sleepHours } = await getSettings();
    const routineMinutes = routine.reduce((s, r) => s + (Number(r.minutes) || 0), 0);
    const todoMinutes = todos.filter((t) => !t.parentId).reduce((s, t) => s + (Number(t.minutes) || 0), 0);
    const plannedMinutes = routineMinutes + habitMinutes + todoMinutes;
    const awakeMinutes = Math.round((24 - sleepHours) * 60);
    return { routineMinutes, habitMinutes, todoMinutes, plannedMinutes, awakeMinutes, sleepHours, freeMinutes: awakeMinutes - plannedMinutes, fits: plannedMinutes <= awakeMinutes };
  };

  // To-dos shown on a date:
  //   daily  (default) → only on its own date
  //   always ("all-time") → every day from its date until the day it's ticked (shown done on that day, gone after)
  const todosFor = async (date) => {
    const [daily, always] = await Promise.all([store.find('todos', { date }), store.find('todos', { kind: 'always' })]);
    const shown = daily.filter((t) => t.kind !== 'always');
    for (const t of always) {
      if (t.date > date) continue;
      const doneOn = t.done ? t.doneOn || t.date : null;
      if (doneOn && doneOn < date) continue;
      shown.push({ ...t, done: doneOn === date });
    }
    return shown;
  };

  // Marks to-dos that don't fit (noTime): standalone ones past the day's waking hours,
  // and ones inside a routine item (e.g. Office work) past that item's own time. Oldest first keep their place.
  const markNoTime = (todos, routine, budgetInfo) => {
    const containers = new Map(routine.filter((r) => r.holdsTodos).map((r) => [r._id, { cap: Number(r.minutes) || 0, used: 0 }]));
    let used = budgetInfo.routineMinutes + budgetInfo.habitMinutes;
    return todos
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .map((t) => {
        const m = Number(t.minutes) || 0;
        let over;
        if (t.parentId && containers.has(t.parentId)) {
          const c = containers.get(t.parentId);
          c.used += m; over = c.used > c.cap;
        } else {
          used += m; over = used > budgetInfo.awakeMinutes;
        }
        return over && !t.done ? { ...t, noTime: true } : t;
      });
  };

  // Everything the Today screen shows for one date. Also what the daily save stores.
  const dayView = async (date) => {
    const [all, day, todos, weekly, wantToBe] = await Promise.all([
      sortedRoutine(), getDay(date), todosFor(date),
      store.findOne('weeklyHabits', { weekStart: weekStart(date) }), store.findOne('wantToBe', { active: true }),
    ]);
    const routine = await routineFor(date, all);
    const done = new Set(day.routineDone);
    const routineOut = routine.map((x) => ({ ...x, done: done.has(x._id) }));

    // A to-do whose parent item doesn't run today is shown as a normal to-do.
    const parentIds = new Set(routine.filter((x) => x.holdsTodos).map((x) => x._id));
    const cleanTodos = todos.map((t) => (t.parentId && !parentIds.has(t.parentId) ? { ...t, parentId: null } : t));

    // Habit of the week: picked from the routine (routineId) or an older typed-in one.
    let weeklyHabit = null;
    if (weekly) {
      const item = weekly.routineId && all.find((x) => x._id === weekly.routineId);
      weeklyHabit = {
        ...weekly,
        ...(item ? { title: item.title, emoji: item.emoji, minutes: item.minutes, time: item.time || null } : {}),
        runsToday: weekly.routineId ? routine.some((x) => x._id === weekly.routineId) : true,
        done: weeklyDoneOn(weekly, day),
      };
    }

    // Becoming: its habits are the routine items linked to it (wantToBeId) that run on this date.
    // Done = all of them done. Older ones with only a typed-in habit keep their own tick (wantToBeDone).
    let becoming = null;
    if (wantToBe) {
      const habits = routineOut.filter((x) => x.wantToBeId === wantToBe._id);
      const linkedAnyDay = all.some((x) => x.wantToBeId === wantToBe._id);
      becoming = {
        ...wantToBe,
        habits: habits.map((h) => ({ _id: h._id, title: h.title, emoji: h.emoji, minutes: h.minutes, time: h.time || null, color: h.color, done: h.done })),
        linked: linkedAnyDay,
        done: habits.length ? habits.every((h) => h.done) : linkedAnyDay ? false : !!day.wantToBeDone,
      };
    }

    // Only habits that aren't routine items add time of their own.
    const habitMinutes = (weekly && !weekly.routineId ? Number(weekly.minutes) || 0 : 0)
      + (wantToBe && !becoming.linked ? Number(wantToBe.minutes) || 0 : 0);
    const b = await budget({ routine, todos: cleanTodos, habitMinutes });

    return {
      date,
      routine: routineOut,
      todos: markNoTime(cleanTodos, routine, b).sort((a, b2) => Number(a.done) - Number(b2.done) || (a.createdAt || 0) - (b2.createdAt || 0)),
      weeklyHabit,
      wantToBe: becoming,
      percent: pctFor(day, routine),
      totalMinutes: routine.reduce((s, x) => s + x.minutes, 0),
      doneMinutes: routine.filter((x) => done.has(x._id)).reduce((s, x) => s + x.minutes, 0),
      budget: b,
    };
  };

  // Saves the day's full record (what was planned, what got done) into its `days` row.
  // Only the nightly job (11:59 PM) calls this, through saveDays.
  const saveSnapshot = async (date) => {
    const view = await dayView(date);
    const slim = (x) => ({ id: x._id, title: x.title, emoji: x.emoji, minutes: Number(x.minutes) || 0, time: x.time || null, done: !!x.done });
    const snapshot = {
      savedAt: Date.now(),
      percent: view.percent,
      totalMinutes: view.totalMinutes,
      doneMinutes: view.doneMinutes,
      routine: view.routine.map((x) => ({ ...slim(x), wantToBeId: x.wantToBeId || null, holdsTodos: !!x.holdsTodos })),
      todos: view.todos.map((t) => ({ ...slim(t), kind: t.kind || 'daily', parentId: t.parentId || null, noTime: !!t.noTime })),
      weeklyHabit: view.weeklyHabit && { title: view.weeklyHabit.title, emoji: view.weeklyHabit.emoji, routineId: view.weeklyHabit.routineId || null, done: view.weeklyHabit.done },
      wantToBe: view.wantToBe && { id: view.wantToBe._id, title: view.wantToBe.title, done: view.wantToBe.done, habits: view.wantToBe.habits.map(slim) },
      budget: view.budget,
    };
    await store.upsert('days', { date }, { snapshot });
    return snapshot;
  };

  // Nightly: save `date` (always, it's the day ending now) and fill in any of the `back` days before it
  // that have no record yet. A filled-in day uses the routine as it is now (the closest we have).
  const saveDays = async (date, back = 6) => {
    await saveSnapshot(date);
    let filledIn = 0;
    for (let i = 1; i <= back; i++) {
      const d = addDays(date, -i);
      const row = await store.findOne('days', { date: d });
      if (row?.snapshot) continue;
      await saveSnapshot(d); filledIn++;
    }
    return { saved: 1, filledIn };
  };

  return { saveDays, sortedRoutine, routineFor, getDay, pctFor, percentOn, weeklyDoneOn, getSettings, budget, todosFor, dayView, saveSnapshot };
}
