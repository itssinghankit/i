// Insights: the app reads your last 14 days and suggests changes. Each rule is a small function,
// so new "self-improving" rules can be added to RULES without touching the others.
import { Router } from 'express';
import { wrap } from '../lib/http.js';
import { today, addDays, weekStart, weekDays, dow } from '../lib/dates.js';

const RULES = [
  // The item you skip most → make it smaller.
  ({ rates }) => {
    const worst = rates[0];
    if (!worst || worst.pct >= 50) return null;
    return { icon: '🎯', tone: 'warn', title: `“${worst.r.title}” slips often`, body: `Done on ${worst.pct}% of the days it was due. Try a smaller version (${Math.max(5, Math.round(worst.r.minutes / 2))} min) or move it earlier in the day.` };
  },
  // The item you never miss → stack a new habit on it.
  ({ rates }) => {
    const best = rates[rates.length - 1];
    if (!best) return null;
    return { icon: '🏆', tone: 'good', title: `“${best.r.title}” is locked in`, body: `${best.pct}% of its days over 2 weeks. It is a real habit now — stack a new one right after it.` };
  },
  // This week vs last week.
  ({ last14, routine, pctOwn }) => {
    if (!routine.length) return null;
    const avg = (days) => Math.round(days.reduce((s, d) => s + pctOwn(d), 0) / days.length);
    const a = avg(last14.slice(0, 7)), b = avg(last14.slice(7));
    return a >= b
      ? { icon: '📈', tone: 'good', title: `Up ${a - b}% vs the week before`, body: `Average ${a}% of your routine done over the last 7 days.` }
      : { icon: '📉', tone: 'warn', title: `Down ${b - a}% vs the week before`, body: `Average ${a}% over the last 7 days. Pick just your top 3 items tomorrow.` };
  },
  // Streak of strong days.
  ({ last14, routine, pctOwn }) => {
    let streak = 0;
    for (const d of last14) { if (routine.length && pctOwn(d) >= 80) streak++; else break; }
    return streak ? { icon: '🔥', tone: 'good', title: `${streak}-day streak above 80%`, body: 'Keep the chain going today.' } : null;
  },
  // A weekday whose routine doesn't fit in the waking hours.
  async ({ routine, getSettings }) => {
    const { sleepHours } = await getSettings();
    const awake = (24 - sleepHours) * 60;
    const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const over = names.map((n, i) => ({ n, m: routine.filter((x) => x.days.includes(i)).reduce((s, x) => s + x.minutes, 0) })).filter((d) => d.m > awake);
    if (!over.length) return null;
    const worst = over.sort((a, b) => b.m - a.m)[0];
    return { icon: '⏰', tone: 'warn', title: `${worst.n} is over-planned`, body: `${Math.round(worst.m / 6) / 10}h of routine vs ${24 - sleepHours}h awake. Move something to another day or shorten it.` };
  },
  // Last week's habit stuck → offer to add it to the routine.
  async ({ store, getDay, t }) => {
    const prev = await store.findOne('weeklyHabits', { weekStart: addDays(weekStart(t), -7) });
    if (!prev || prev.addedToRoutine) return null;
    const n = (await Promise.all(weekDays(prev.weekStart).map(getDay))).filter((d) => d.weeklyDone).length;
    return n >= 5 ? { icon: '🎓', tone: 'good', title: `Ready to graduate: ${prev.title}`, body: `You did it ${n}/7 days last week. Add it to your daily routine?`, action: { type: 'graduate', id: prev._id } } : null;
  },
];

export function insightsModule({ store, progress }) {
  const r = Router();
  r.get('/', wrap(async (req, res) => {
    const t = today();
    const routine = await progress.sortedRoutine();
    const last14 = await Promise.all(Array.from({ length: 14 }, (_, i) => progress.getDay(addDays(t, -(i + 1)))));
    // Each item is judged only on the weekdays it is meant to run.
    const rates = routine
      .map((x) => {
        const due = last14.filter((d) => x.days.includes(dow(d.date)));
        return { r: x, pct: due.length ? Math.round((due.filter((d) => d.routineDone.includes(x._id)).length / due.length) * 100) : 100 };
      })
      .sort((a, b) => a.pct - b.pct);
    const pctOwn = (d) => progress.pctFor(d, routine.filter((x) => x.days.includes(dow(d.date))));
    const ctx = { store, t, routine, last14, rates, pctOwn, ...progress };
    const tips = await Promise.all(RULES.map((rule) => rule(ctx)));
    res.json(tips.filter(Boolean));
  }));
  return r;
}
