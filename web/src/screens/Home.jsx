import { useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, todayKey, addDays, fmt, mins, fromKey, toKey, buzz } from '../api';
import { Check, Ring, Counter, Segmented, Sheet, listParent, listChild, Empty, spring, soft } from '../ui';

export default function Home({ date, setDate, refreshKey, openWeekly, openAddTodo, onCounts }) {
  const [data, setData] = useState(null);
  const [seg, setSeg] = useState('routine');
  const [dir, setDir] = useState(0);
  const [calOpen, setCalOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const lastPct = useRef(null);

  const load = useCallback(() => api.get(`/day/${date}`).then(setData), [date]);
  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (!data) return;
    onCounts?.({ routineLeft: data.routine.filter((r) => !r.done).length, todoLeft: data.todos.filter((t) => !t.done).length });
    // Confetti the moment the whole routine is done.
    if (lastPct.current !== null && lastPct.current < 100 && data.percent === 100) {
      import('canvas-confetti').then(({ default: confetti }) => confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors: ['#7c3aed', '#ec4899', '#f97316', '#22c55e', '#38bdf8'] }));
      buzz(60);
    }
    lastPct.current = data.percent;
  }, [data]);

  const go = (n) => { setDir(n); lastPct.current = null; setDate(addDays(date, n)); };
  const jump = (d) => { setDir(d > date ? 1 : -1); lastPct.current = null; setDate(d); };

  // Optimistic toggles: flip in the UI first, then save.
  const toggleRoutine = (id) => {
    setData((d) => {
      const routine = d.routine.map((r) => (r._id === id ? { ...r, done: !r.done } : r));
      const done = routine.filter((r) => r.done);
      return { ...d, routine, percent: Math.round((done.length / routine.length) * 100), doneMinutes: done.reduce((s, r) => s + r.minutes, 0) };
    });
    api.post(`/day/${date}/toggle`, { kind: 'routine', id }).catch(load);
  };
  const toggleHabit = (kind) => {
    const key = kind === 'weekly' ? 'weeklyHabit' : 'wantToBe';
    setData((d) => ({ ...d, [key]: { ...d[key], done: !d[key].done } }));
    api.post(`/day/${date}/toggle`, { kind }).catch(load);
  };
  const toggleTodo = (t) => {
    setData((d) => ({ ...d, todos: d.todos.map((x) => (x._id === t._id ? { ...x, done: !x.done } : x)) }));
    api.patch(`/todos/${t._id}`, { done: !t.done }).catch(load);
  };
  const removeTodo = (t) => {
    setData((d) => ({ ...d, todos: d.todos.filter((x) => x._id !== t._id) }));
    api.del(`/todos/${t._id}`).catch(load);
  };

  const isToday = date === todayKey();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Top bar */}
      <div className="between" style={{ marginBottom: 16 }}>
        <div>
          <div className="small muted bold">{hello} 👋</div>
          <h1>Let’s grow <span className="grad-text">1%</span> today</h1>
        </div>
        <motion.button className="icon-btn" style={{ width: 46, height: 46, background: 'var(--grad)', border: 0, color: '#fff', boxShadow: '0 8px 20px rgba(124,58,237,.35)' }}
          whileTap={{ scale: 0.88 }} onClick={() => setChartOpen(true)} aria-label="Weekly chart">
          <ChartColumnBig size={20} />
        </motion.button>
      </div>

      {/* Date bar, like the calendar screenshot */}
      <div className="between" style={{ marginBottom: 14 }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.h2 key={date} style={{ fontSize: 24, fontWeight: 800 }} custom={dir}
            initial={{ opacity: 0, x: dir * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -30 }} transition={soft}>
            {fmt(date, { weekday: 'short', day: 'numeric', month: 'short' })}
          </motion.h2>
        </AnimatePresence>
        <div className="row" style={{ gap: 6 }}>
          <AnimatePresence>
            {!isToday && (
              <motion.button className="pill-btn" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => jump(todayKey())}>Today</motion.button>
            )}
          </AnimatePresence>
          <motion.button whileTap={{ scale: 0.85 }} className="icon-btn" onClick={() => setCalOpen(true)} aria-label="Pick a date"><CalendarDays size={18} /></motion.button>
          <motion.button whileTap={{ scale: 0.85 }} className="icon-btn" onClick={() => go(-1)} aria-label="Previous day"><ChevronLeft size={20} /></motion.button>
          <motion.button whileTap={{ scale: 0.85 }} className="icon-btn" onClick={() => go(1)} aria-label="Next day"><ChevronRight size={20} /></motion.button>
        </div>
      </div>

      {!data ? <Skeleton /> : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={date} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.22 }}>
            {/* Two habit cards: habit of the week + want-to-be habit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <HabitCard
                kicker="Habit of the week" gradient="linear-gradient(140deg,#7c3aed,#c026d3 60%,#ec4899)"
                habit={data.weeklyHabit && { ...data.weeklyHabit, sub: data.weeklyHabit.minutes ? `${mins(data.weeklyHabit.minutes)} a day` : null, subPrefix: '⏱' }} emptyText="Tap 🌱 to set one" onToggle={() => toggleHabit('weekly')} onOpen={openWeekly}
              />
              <HabitCard
                kicker={data.wantToBe ? `Becoming · ${data.wantToBe.byYear}` : 'Want to be'} gradient="linear-gradient(140deg,#f97316,#f43f5e 70%)"
                habit={data.wantToBe && { title: data.wantToBe.habit, emoji: data.wantToBe.emoji, done: data.wantToBe.done, sub: `${data.wantToBe.title}${data.wantToBe.minutes ? ` · ${mins(data.wantToBe.minutes)}` : ''}` }}
                emptyText="Add one in More" onToggle={() => toggleHabit('wantToBe')}
              />
            </div>

            {/* Progress summary */}
            <motion.div className="card" style={{ padding: 16, marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
              <Ring percent={data.percent} id="homeRing">
                <div style={{ fontWeight: 800, fontSize: 20 }}><Counter value={data.percent} suffix="%" /></div>
              </Ring>
              <div style={{ flex: 1 }}>
                <div className="bold" style={{ fontSize: 16 }}>
                  {data.percent === 100 ? 'Routine complete! 🎉' : `${data.routine.filter((r) => r.done).length} of ${data.routine.length} routine done`}
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>{mins(data.doneMinutes)} of {mins(data.totalMinutes)} invested</div>
                <div style={{ height: 8, borderRadius: 9, background: 'var(--soft)', marginTop: 10, overflow: 'hidden' }}>
                  <motion.div style={{ height: '100%', borderRadius: 9, background: 'var(--grad-cool)' }}
                    animate={{ width: `${data.totalMinutes ? (data.doneMinutes / data.totalMinutes) * 100 : 0}%` }} transition={soft} />
                </div>
              </div>
            </motion.div>

            <DayBudget b={data.budget} />

            <div style={{ marginTop: 18 }}>
              <Segmented layoutId="homeSeg" value={seg} onChange={setSeg} options={[
                { value: 'routine', label: 'Daily routine', count: data.routine.filter((r) => !r.done).length },
                { value: 'todo', label: 'To-do', count: data.todos.filter((t) => !t.done).length },
              ]} />
            </div>

            <AnimatePresence mode="wait">
              {seg === 'routine' ? (
                <motion.div key="r" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                  <div className="section-label">{fmt(date, { weekday: 'long' })} routine · {mins(data.totalMinutes)}</div>
                  {data.routine.length === 0 ? <Empty emoji="🌱" text="No routine yet. Build it in the Routine tab." /> : (
                    <motion.div className="card list" variants={listParent} initial="hidden" animate="show">
                      {data.routine.map((r) => {
                        const inside = r.holdsTodos ? data.todos.filter((t) => t.parentId === r._id) : [];
                        return (
                          <motion.div key={r._id} variants={listChild} style={{ borderTop: '1px solid var(--line)' }} className="routine-block">
                            <div className="item" style={{ borderTop: 0 }} onClick={() => toggleRoutine(r._id)}>
                              <div className="bar" style={{ background: r.color }} />
                              <div className="emoji" style={{ background: `${r.color}1f` }}>{r.emoji}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={`title ${r.done ? 'done' : ''}`}>{r.title}</div>
                                {r.holdsTodos && <div className="meta">{inside.filter((t) => t.done).length}/{inside.length} tasks done</div>}
                              </div>
                              <span className="time-chip" style={{ background: `${r.color}1a`, color: r.color }}>{mins(r.minutes)}</span>
                              <Check done={r.done} color={r.color} onToggle={() => toggleRoutine(r._id)} />
                            </div>
                            {r.holdsTodos && (
                              <div style={{ padding: '0 16px 12px 70px' }}>
                                <AnimatePresence initial={false}>
                                  {inside.map((t) => (
                                    <motion.div key={t._id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                      className="row" style={{ padding: '6px 0', gap: 10 }} onClick={() => toggleTodo(t)}>
                                      <Check size={20} done={t.done} color={r.color} onToggle={() => toggleTodo(t)} />
                                      <span className={`small ${t.done ? 'faint' : ''}`} style={{ textDecoration: t.done ? 'line-through' : 'none', fontWeight: 500 }}>{t.title}</span>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                                <button className="tiny bold row" style={{ gap: 4, color: r.color, marginTop: 4 }} onClick={(e) => { e.stopPropagation(); openAddTodo({ date, parentId: r._id }); }}>
                                  <Plus size={14} /> Add a task to {r.title}
                                </button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="t" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                  <div className="between">
                    <div className="section-label">Just for {isToday ? 'today' : fmt(date, { day: 'numeric', month: 'short' })}</div>
                    <motion.button whileTap={{ scale: 0.9 }} className="ghost-btn row" style={{ gap: 4, marginTop: 12, background: '#ede9fe', color: 'var(--violet)' }} onClick={() => openAddTodo({ date })}>
                      <Plus size={16} /> Add
                    </motion.button>
                  </div>
                  {data.todos.length === 0 ? <Empty emoji="🎈" text="Nothing extra today. Enjoy!" /> : (
                    <>
                      {/* One group per routine item that holds to-dos (e.g. Office work), then the rest */}
                      {[...data.routine.filter((r) => r.holdsTodos), null].map((group) => {
                        const list = data.todos.filter((t) => (group ? t.parentId === group._id : !t.parentId));
                        if (!list.length) return null;
                        const extra = list.reduce((s, t) => s + (Number(t.minutes) || 0), 0);
                        return (
                          <div key={group?._id || 'other'} style={{ marginBottom: 14 }}>
                            <div className="between tiny bold" style={{ margin: '0 4px 8px', color: 'var(--ink-2)' }}>
                              <span>{group ? `${group.emoji} ${group.title}` : '✅ Other to-dos'}</span>
                              <span className="faint">{group ? `inside its fixed ${mins(group.minutes)}` : extra ? `+${mins(extra)} to your day` : ''}</span>
                            </div>
                            <motion.div className="card list" variants={listParent} initial="hidden" animate="show">
                              <AnimatePresence initial={false}>
                                {list.map((t) => (
                                  <SwipeRow key={t._id} onDelete={() => removeTodo(t)}>
                                    <div className="item" onClick={() => toggleTodo(t)}>
                                      <Check done={t.done} color={group?.color || '#22c55e'} onToggle={() => toggleTodo(t)} />
                                      <div className={`title ${t.done ? 'done' : ''}`} style={{ flex: 1 }}>{t.title}</div>
                                      {!group && t.minutes > 0 && <span className="time-chip" style={{ background: '#dcfce7', color: '#15803d' }}>{mins(t.minutes)}</span>}
                                    </div>
                                  </SwipeRow>
                                ))}
                              </AnimatePresence>
                            </motion.div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className="tiny faint" style={{ textAlign: 'center', marginTop: 10 }}>Swipe a to-do left to delete it</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}

      <CalendarSheet open={calOpen} onClose={() => setCalOpen(false)} value={date} onPick={(d) => { setCalOpen(false); jump(d); }} />
      <WeekChartSheet open={chartOpen} onClose={() => setChartOpen(false)} anchor={date} onPickDay={(d) => { setChartOpen(false); jump(d); }} />
    </div>
  );
}

function HabitCard({ kicker, gradient, habit, emptyText, onToggle, onOpen }) {
  return (
    <motion.div className="habit" style={{ background: gradient }} whileTap={{ scale: 0.97 }} onClick={habit ? onToggle : onOpen}>
      <div className="shine" />
      <div>
        <div className="kicker">{kicker}</div>
        <div className="h-title">{habit ? `${habit.emoji} ${habit.title}` : emptyText}</div>
        {habit?.sub && <div className="tiny" style={{ opacity: 0.85, marginTop: 4 }}>{habit.subPrefix || '→'} {habit.sub}</div>}
      </div>
      {habit && (
        <div className="between" style={{ marginTop: 10 }}>
          <span className="tiny bold" style={{ opacity: 0.9 }}>{habit.done ? 'Done today' : 'Not yet'}</span>
          <motion.div className="h-check" animate={{ background: habit.done ? '#fff' : 'rgba(255,255,255,.25)', scale: habit.done ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.35 }}>
            {habit.done && <CheckIcon size={18} strokeWidth={3} color="#c026d3" />}
          </motion.div>
        </div>
      )}
      {!habit && onOpen && <Sprout size={18} />}
    </motion.div>
  );
}

// Is everything planned for this day possible? Routine + habits + standalone to-dos vs waking hours.
function DayBudget({ b }) {
  if (!b) return null;
  const parts = [
    { label: 'Routine', m: b.routineMinutes, c: 'linear-gradient(90deg,#6366f1,#38bdf8)' },
    { label: 'Habits', m: b.habitMinutes, c: 'linear-gradient(90deg,#a855f7,#ec4899)' },
    { label: 'To-dos', m: b.todoMinutes, c: 'linear-gradient(90deg,#22c55e,#84cc16)' },
  ];
  const total = Math.max(b.awakeMinutes, b.plannedMinutes);
  return (
    <motion.div className="card" style={{ padding: 16, marginTop: 12 }}>
      <div className="between">
        <div>
          <div className="bold">Day plan</div>
          <div className="small muted" style={{ marginTop: 2 }}>{mins(b.plannedMinutes)} planned of {mins(b.awakeMinutes)} awake</div>
        </div>
        <motion.span key={String(b.fits)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring} className="time-chip"
          style={{ fontSize: 13, padding: '6px 11px', background: b.fits ? '#dcfce7' : '#ffe4e6', color: b.fits ? '#15803d' : '#e11d48' }}>
          {b.fits ? `✓ ${mins(b.freeMinutes)} free` : `Over by ${mins(-b.freeMinutes)}`}
        </motion.span>
      </div>
      <div style={{ display: 'flex', height: 14, borderRadius: 9, overflow: 'hidden', marginTop: 12, background: 'var(--soft)', gap: 2 }}>
        {parts.map((p, i) => p.m > 0 && (
          <motion.div key={p.label} style={{ background: p.c }} initial={{ width: 0 }} animate={{ width: `${(p.m / total) * 100}%` }} transition={{ ...soft, delay: i * 0.08 }} />
        ))}
      </div>
      <div className="row tiny" style={{ gap: 12, marginTop: 8, flexWrap: 'wrap', color: 'var(--ink-2)' }}>
        {parts.map((p) => (
          <span key={p.label} className="row" style={{ gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: p.c }} />{p.label} {mins(p.m)}
          </span>
        ))}
        <span className="faint">Sleep {b.sleepHours}h</span>
      </div>
    </motion.div>
  );
}

// Drag a row left to reveal delete.
function SwipeRow({ children, onDelete }) {
  return (
    <motion.div style={{ position: 'relative', borderTop: '1px solid var(--line)' }} variants={listChild}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#fff,#f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20, color: '#fff' }}>
        <Trash2 size={20} />
      </div>
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.7, right: 0 }} style={{ position: 'relative' }}
        onDragEnd={(_, info) => { if (info.offset.x < -110) { buzz(25); onDelete(); } }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div>
      {[128, 120, 300].map((h, i) => (
        <div key={i} className="card pulse" style={{ height: h, marginTop: 12 }} />
      ))}
    </div>
  );
}

// ---------- Calendar sheet: jump to any date. Days are tinted by how much of the routine was done. ----------
function CalendarSheet({ open, onClose, value, onPick }) {
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const [stats, setStats] = useState({});
  useEffect(() => { if (open) setMonth(value.slice(0, 7)); }, [open]);
  const first = fromKey(`${month}-01`);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  useEffect(() => {
    if (!open) return;
    api.get(`/range?from=${toKey(first)}&to=${toKey(last)}`).then((rows) => setStats(Object.fromEntries(rows.map((r) => [r.date, r.percent]))));
  }, [open, month]);
  const shift = (n) => { const d = new Date(first.getFullYear(), first.getMonth() + n, 1); setMonth(toKey(d).slice(0, 7)); };
  const lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: last.getDate() }, (_, i) => toKey(new Date(first.getFullYear(), first.getMonth(), i + 1)))];
  const t = todayKey();
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="between" style={{ marginBottom: 14 }}>
        <h2>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, textAlign: 'center' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="tiny faint bold">{d}</div>)}
        <AnimatePresence mode="popLayout">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const p = stats[d];
            const sel = d === value;
            return (
              <motion.button key={d} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008 }}
                whileTap={{ scale: 0.85 }} onClick={() => onPick(d)}
                style={{
                  aspectRatio: '1', borderRadius: 14, fontWeight: 700, fontSize: 14, position: 'relative',
                  background: sel ? 'var(--grad)' : p != null ? `rgba(124,58,237,${0.06 + (p / 100) * 0.45})` : 'var(--soft)',
                  color: sel ? '#fff' : p > 60 ? '#3b0f80' : 'var(--ink)',
                  outline: d === t && !sel ? '2px solid var(--violet)' : 'none',
                }}>
                {Number(d.slice(8))}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="row tiny faint" style={{ justifyContent: 'center', marginTop: 14, gap: 6 }}>
        Less {[0.08, 0.2, 0.35, 0.5].map((a) => <span key={a} style={{ width: 14, height: 14, borderRadius: 4, background: `rgba(124,58,237,${a})` }} />)} More done
      </div>
    </Sheet>
  );
}

// ---------- Weekly chart: % of routine done per day, with week arrows ----------
function WeekChartSheet({ open, onClose, anchor, onPickDay }) {
  const [ref, setRef] = useState(anchor);
  const [week, setWeek] = useState(null);
  const [dir, setDir] = useState(0);
  useEffect(() => { if (open) setRef(anchor); }, [open]);
  useEffect(() => { if (open) api.get(`/week?date=${ref}`).then(setWeek); }, [open, ref]);
  const shift = (n) => { setDir(n); setRef(addDays(ref, n * 7)); };
  const vals = week?.days.filter((d) => d.percent != null).map((d) => d.percent) || [];
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const best = week?.days.reduce((b, d) => (d.percent != null && (b == null || d.percent > b.percent) ? d : b), null);
  const color = (p) => (p >= 80 ? 'linear-gradient(180deg,#a855f7,#7c3aed)' : p >= 50 ? 'linear-gradient(180deg,#f472b6,#ec4899)' : 'linear-gradient(180deg,#fdba74,#f97316)');
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="between" style={{ marginBottom: 6 }}>
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous week"><ChevronLeft size={20} /></button>
        <div style={{ textAlign: 'center' }}>
          <div className="bold">{week && `${fmt(week.start, { day: 'numeric', month: 'short' })} – ${fmt(addDays(week.start, 6), { day: 'numeric', month: 'short' })}`}</div>
          <div className="tiny faint">Daily routine completion</div>
        </div>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next week"><ChevronRight size={20} /></button>
      </div>
      <div className="row" style={{ gap: 10, margin: '14px 0 6px' }}>
        <div className="card" style={{ flex: 1, padding: 12, boxShadow: 'none' }}>
          <div className="tiny faint bold">AVERAGE</div><div style={{ fontSize: 24, fontWeight: 800 }}><Counter value={avg} suffix="%" /></div>
        </div>
        <div className="card" style={{ flex: 1, padding: 12, boxShadow: 'none' }}>
          <div className="tiny faint bold">BEST DAY</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{best ? `${fmt(best.date, { weekday: 'short' })} · ${best.percent}%` : '—'}</div>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={week?.start} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 240, padding: '28px 2px 0', position: 'relative' }}>
          {[25, 50, 75, 100].map((g) => (
            <div key={g} style={{ position: 'absolute', left: 0, right: 0, bottom: `calc(${g}% * 0.78 + 52px)`, borderTop: '1px dashed var(--line)' }} />
          ))}
          {week?.days.map((d, i) => (
            <button key={d.date} onClick={() => onPickDay(d.date)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6, position: 'relative' }}>
              <div className="tiny bold" style={{ color: d.percent == null ? 'var(--ink-3)' : 'var(--ink)' }}>{d.percent == null ? '' : `${d.percent}%`}</div>
              <div style={{ width: '100%', height: '78%', display: 'flex', alignItems: 'flex-end', background: 'var(--soft)', borderRadius: 12 }}>
                <motion.div style={{ width: '100%', borderRadius: 12, background: d.percent == null ? 'transparent' : color(d.percent) }}
                  initial={{ height: 0 }} animate={{ height: `${d.percent ?? 0}%` }} transition={{ ...soft, delay: i * 0.05 }} />
              </div>
              <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                <div className="tiny bold" style={{ color: d.date === todayKey() ? 'var(--violet)' : 'var(--ink-2)' }}>{fmt(d.date, { weekday: 'short' })}</div>
                <div className="tiny faint">{fmt(d.date, { day: 'numeric', month: 'short' })}</div>
              </div>
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
      <div className="tiny faint" style={{ textAlign: 'center', marginTop: 12 }}>Tap a bar to open that day</div>
    </Sheet>
  );
}
