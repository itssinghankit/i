// Dummy data, built relative to today so it always looks fresh.
import { today, addDays, weekStart, dow } from '../lib/dates.js';

// days: 0 = Monday … 6 = Sunday. holdsTodos: to-dos can sit inside this item (its time is fixed).
const WEEKDAYS = [0, 1, 2, 3, 4];
const WEEKEND = [5, 6];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const ROUTINE = [
  { title: 'Wake up & drink water', minutes: 5, emoji: '💧', color: '#38bdf8', days: ALL },
  { title: 'Morning workout', minutes: 45, emoji: '🏋️', color: '#f97316', days: WEEKDAYS },
  { title: 'Meditate', minutes: 15, emoji: '🧘', color: '#a855f7', days: ALL },
  { title: 'Office work', minutes: 540, emoji: '💼', color: '#6366f1', days: WEEKDAYS, holdsTodos: true },
  { title: 'Read a book', minutes: 30, emoji: '📚', color: '#22c55e', days: ALL },
  { title: 'Learn something new', minutes: 30, emoji: '🧠', color: '#ec4899', days: WEEKDAYS },
  { title: 'Evening walk', minutes: 25, emoji: '🚶', color: '#14b8a6', days: WEEKDAYS },
  { title: 'Journal & plan tomorrow', minutes: 10, emoji: '📝', color: '#eab308', days: ALL },
  { title: 'Long run', minutes: 60, emoji: '🏃', color: '#f97316', days: WEEKEND },
  { title: 'Family time', minutes: 180, emoji: '👨‍👩‍👧', color: '#ec4899', days: WEEKEND },
  { title: 'Weekly review & plan', minutes: 30, emoji: '🗓️', color: '#7c3aed', days: [6] },
];

// Small seeded random so the dummy history is the same on every reseed.
function rng(seed) { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

export async function seedIfEmpty(store, force = false) {
  if (!force && (await store.count('routine')) > 0) return false;
  await store.wipe();
  const t = today();
  const rand = rng(42);

  const routine = [];
  for (const [i, r] of ROUTINE.entries()) routine.push(await store.insert('routine', { ...r, order: i }));

  // 4 weeks of history; some items are done more often than others so the insights have something to say.
  const doneRate = [0.95, 0.7, 0.55, 0.9, 0.6, 0.35, 0.65, 0.5, 0.6, 0.85, 0.7];
  for (let back = 27; back >= 1; back--) {
    const date = addDays(t, -back);
    const routineDone = routine.filter((r, i) => r.days.includes(dow(date)) && rand() < doneRate[i]).map((r) => r._id);
    await store.insert('days', { date, routineDone, weeklyDone: rand() < 0.7, wantToBeDone: rand() < 0.6 });
  }
  await store.insert('days', { date: t, routineDone: routine.filter((r) => r.days.includes(dow(t))).slice(0, 2).map((r) => r._id), weeklyDone: false, wantToBeDone: true });

  // Office to-dos sit inside "Office work" (no extra time); the rest are standalone with their own time.
  const office = routine.find((r) => r.holdsTodos)._id;
  const todos = [
    ['Call mom ☎️', t, true, null, 15], ['Pay electricity bill', t, false, null, 10], ['Buy groceries for the week', t, false, null, 45],
    ['Reply to client emails', t, true, office, 0], ['Prepare sprint demo', t, false, office, 0], ['Review 2 pull requests', t, false, office, 0],
    ['Send invoice to client', addDays(t, -1), true, office, 0], ['Renew gym membership', addDays(t, 1), false, null, 20],
  ];
  for (const [title, date, done, parentId, minutes] of todos) await store.insert('todos', { title, date, done, parentId, minutes, createdAt: Date.now() });

  const ws = weekStart(t);
  const habits = [
    [addDays(ws, -21), 'No phone for the first hour', '📵'],
    [addDays(ws, -14), 'Sleep before 11 PM', '😴'],
    [addDays(ws, -7), '10 minutes of stretching', '🤸'],
    [ws, 'Cold shower in the morning', '🚿'],
  ];
  for (const [w, title, emoji] of habits) await store.insert('weeklyHabits', { weekStart: w, title, emoji, minutes: 10, addedToRoutine: false });

  const y = Number(t.slice(0, 4));
  const wantToBe = [
    { title: 'A fit, strong person', byYear: y + 1, habit: '10,000 steps a day', emoji: '💪', minutes: 40, active: true },
    { title: 'A published author', byYear: y + 3, habit: 'Write 300 words', emoji: '✍️', minutes: 20, active: false },
    { title: 'Financially free', byYear: y + 8, habit: 'Track every rupee spent', emoji: '💰', minutes: 5, active: false },
  ];
  for (const w of wantToBe) await store.insert('wantToBe', w);

  const res = [
    [y, 'Run a half marathon', '🏃', false], [y, 'Read 24 books', '📖', true], [y, 'Learn to swim', '🏊', false],
    [y, 'Save 30% of income', '🏦', false], [y - 1, 'Start going to the gym', '🏋️', true],
    [y - 1, 'Visit 3 new cities', '✈️', true], [y - 1, 'Learn guitar basics', '🎸', false],
    [y + 1, 'Launch my own app', '🚀', false],
  ];
  for (const [year, title, emoji, done] of res) await store.insert('resolutions', { year, title, emoji, done });

  const nw = [
    ['need', 'Health insurance', 'Before March', 12000, false], ['need', 'New running shoes', 'Old pair is worn out', 4500, true],
    ['need', 'Emergency fund (6 months)', '', 300000, false], ['want', 'Noise-cancelling headphones', '', 25000, false],
    ['want', 'Trip to Japan', 'Cherry blossom season', 180000, false], ['want', 'Mechanical keyboard', '', 9000, false],
  ];
  for (const [type, title, note, price, done] of nw) await store.insert('needsWants', { type, title, note, price, done });
  return true;
}

// `npm run seed` resets everything to the dummy data.
if (process.argv[1]?.endsWith('seed.js')) {
  const { openStore } = await import('./store.js');
  const store = await openStore();
  await seedIfEmpty(store, true);
  setTimeout(() => { console.log(`Seeded dummy data into ${store.kind()} store.`); process.exit(0); }, 200);
}
