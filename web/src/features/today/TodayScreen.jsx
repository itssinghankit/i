import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, keepIfSame, todayKey, addDays, fmt, mins, fromKey, toKey, buzz, clockTime } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, spring, soft } from '../../components';

import HabitCard from './HabitCard.jsx';
import DayBudget from './DayBudget.jsx';
import SwipeRow from './SwipeRow.jsx';
import Skeleton from './Skeleton.jsx';
import CalendarSheet from './CalendarSheet.jsx';
import WeekChartSheet from './WeekChartSheet.jsx';
import BecomingSheet from './BecomingSheet.jsx';

// memo: Today only re-renders when its own inputs change, not on every tab switch.
export default memo(function Home({ date, setDate, refreshKey, openWeekly, openAddTodo, onCounts }) {
  const [data, setData] = useState(null);
  const [seg, setSeg] = useState('routine');
  const [dir, setDir] = useState(0);
  const [calOpen, setCalOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [becomingOpen, setBecomingOpen] = useState(false);
  const lastPct = useRef(null);

  const load = useCallback(() => api.get(`/day/${date}`).then(keepIfSame(setData)), [date]);
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
  // setRoutine: mark these routine items done / not done, and keep the cards, percent and minutes in step.
  const setRoutine = (d, ids, value) => {
    const pick = (r) => (ids.includes(r._id) ? { ...r, done: typeof value === 'function' ? value(r) : value } : r);
    const routine = d.routine.map(pick);
    const done = routine.filter((r) => r.done);
    const doneIds = new Set(done.map((r) => r._id));
    const weeklyHabit = d.weeklyHabit?.routineId ? { ...d.weeklyHabit, done: doneIds.has(d.weeklyHabit.routineId) } : d.weeklyHabit;
    let wantToBe = d.wantToBe;
    if (wantToBe?.habits.length) {
      const habits = wantToBe.habits.map((h) => ({ ...h, done: doneIds.has(h._id) }));
      wantToBe = { ...wantToBe, habits, done: habits.every((h) => h.done) };
    }
    return { ...d, routine, weeklyHabit, wantToBe, percent: routine.length ? Math.round((done.length / routine.length) * 100) : 0, doneMinutes: done.reduce((s2, r) => s2 + r.minutes, 0) };
  };
  const toggleRoutine = (id) => {
    setData((d) => setRoutine(d, [id], (r) => !r.done));
    api.post(`/day/${date}/toggle`, { kind: 'routine', id }).catch(load);
  };
  const toggleHabit = (kind) => {
    setData((d) => {
      if (kind === 'weekly' && d.weeklyHabit?.routineId) return setRoutine(d, [d.weeklyHabit.routineId], (r) => !r.done);
      if (kind === 'wantToBe' && d.wantToBe?.habits.length) return setRoutine(d, d.wantToBe.habits.map((h) => h._id), !d.wantToBe.done);
      const key = kind === 'weekly' ? 'weeklyHabit' : 'wantToBe';
      return { ...d, [key]: { ...d[key], done: !d[key].done } };
    });
    api.post(`/day/${date}/toggle`, { kind }).catch(load);
  };
  // A to-do that doesn't fit the time left (noTime) can't be ticked. An all-time one remembers the day it was ticked.
  const toggleTodo = (t) => {
    if (t.noTime) { buzz(30); return; }
    setData((d) => ({ ...d, todos: d.todos.map((x) => (x._id === t._id ? { ...x, done: !x.done } : x)) }));
    api.patch(`/todos/${t._id}`, t.done ? { done: false } : { done: true, doneOn: date }).catch(load);
  };
  const removeTodo = (t) => {
    setData((d) => ({ ...d, todos: d.todos.filter((x) => x._id !== t._id) }));
    api.del(`/todos/${t._id}`).catch(load);
  };

  const isToday = date === todayKey();

  return (
    <div>
      {/* Top bar */}
      <div className="between" style={{ marginBottom: 16 }}>
        <h1>Let’s grow <span className="grad-text">1%</span> today</h1>
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
            {/* Two habit cards: habit of the week (a routine habit) + Becoming (its routine habits) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(() => {
                const w = data.weeklyHabit;
                const runs = w && w.runsToday !== false;
                return (
                  <HabitCard
                    kicker="Habit of the week" gradient="linear-gradient(140deg,#7c3aed,#c026d3 60%,#ec4899)"
                    title={w && `${w.emoji} ${w.title}`} emptyText="Tap 🌱 to pick one"
                    lines={w ? [{ text: w.time ? clockTime(w.time) : 'Every day', meta: w.minutes ? mins(w.minutes) : null }] : []}
                    note={w && !runs ? 'Not in your routine today' : null}
                    done={w?.done} onCheck={runs ? () => toggleHabit('weekly') : null}
                    onOpen={w && runs ? () => toggleHabit('weekly') : openWeekly}
                  />
                );
              })()}
              {(() => {
                const b = data.wantToBe;
                const lines = !b ? [] : b.habits.length
                  ? b.habits.map((h) => ({ text: h.title, meta: mins(h.minutes), done: h.done }))
                  : !b.linked && b.habit ? [{ text: b.habit, meta: b.minutes ? mins(b.minutes) : null }] : [];
                const canTick = b && (b.habits.length > 0 || (!b.linked && !!b.habit));
                return (
                  <HabitCard
                    kicker={b ? `Becoming${b.byYear ? ` · ${b.byYear}` : ''}` : 'Want to be'} gradient="linear-gradient(140deg,#f97316,#f43f5e 70%)" tickColor="#f43f5e"
                    title={b && `${b.emoji || '🌟'} ${b.title}`} emptyText="Add one in More"
                    lines={lines} note={b && !lines.length ? (b.linked ? 'No habits today' : 'Add routine habits to it') : null}
                    done={b?.done} onCheck={canTick ? () => toggleHabit('wantToBe') : null}
                    onOpen={b ? () => setBecomingOpen(true) : undefined}
                  />
                );
              })()}
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
                    <div className="card list">
                      {data.routine.map((r, idx) => {
                        const inside = r.holdsTodos ? data.todos.filter((t) => t.parentId === r._id) : [];
                        return (
                          <div key={r._id} style={{ borderTop: '1px solid var(--line)', '--i': idx }} className="routine-block rise">
                            <div className="item" style={{ borderTop: 0 }} onClick={() => toggleRoutine(r._id)}>
                              <div className="bar" style={{ background: r.color }} />
                              <div className="emoji" style={{ background: `${r.color}1f` }}>{r.emoji}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={`title ${r.done ? 'done' : ''}`}>{r.title}</div>
                                {(r.time || r.holdsTodos) && (
                                  <div className="meta">
                                    {r.time && <span>{clockTime(r.time, r.minutes)}</span>}
                                    {r.holdsTodos && <span>{inside.filter((t) => t.done).length}/{inside.length} tasks done</span>}
                                  </div>
                                )}
                              </div>
                              <span className="time-chip" style={{ background: `${r.color}1a`, color: r.color }}>{mins(r.minutes)}</span>
                              <Check done={r.done} color={r.color} onToggle={() => toggleRoutine(r._id)} />
                            </div>
                            {r.holdsTodos && (
                              <div style={{ padding: '0 16px 12px 70px' }}>
                                {inside.map((t) => (
                                  <div key={t._id} className="row" style={{ padding: '6px 0', gap: 10, opacity: t.noTime ? 0.55 : 1 }} onClick={() => toggleTodo(t)}>
                                    <span style={{ minWidth: 0, flex: 1 }}>
                                      <span className={`small ${t.done ? 'faint' : ''}`} style={{ textDecoration: t.done ? 'line-through' : 'none', fontWeight: 500 }}>{t.title}</span>
                                      {t.time && <span className="tiny faint"> · {clockTime(t.time, t.minutes)}</span>}
                                      {t.noTime && <span className="no-time-msg" style={{ display: 'block' }}>Not enough time left in {r.title}</span>}
                                    </span>
                                    <Check size={20} done={t.done} color={r.color} onToggle={() => toggleTodo(t)} />
                                  </div>
                                ))}
                                <button className="tiny bold row" style={{ gap: 4, color: r.color, marginTop: 4 }} onClick={(e) => { e.stopPropagation(); openAddTodo({ date, parentId: r._id }); }}>
                                  <Plus size={14} /> Add a task to {r.title}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="t" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                  <div className="between">
                    <div className="section-label">Just for {isToday ? 'today' : fmt(date, { day: 'numeric', month: 'short' })}</div>
                    <motion.button whileTap={{ scale: 0.9 }} className="ghost-btn row" style={{ gap: 4, marginTop: 12, background: 'var(--tint)', color: 'var(--violet)' }} onClick={() => openAddTodo({ date })}>
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
                              <span className="faint">{group ? `${mins(extra)} of its ${mins(group.minutes)}` : extra ? `+${mins(extra)} to your day` : ''}</span>
                            </div>
                            <div className="card list">
                              <AnimatePresence initial={false}>
                                {list.map((t, idx) => (
                                  <SwipeRow key={t._id} idx={idx} onDelete={() => removeTodo(t)}>
                                    <div className={`item ${t.noTime ? 'no-time' : ''}`} onClick={() => toggleTodo(t)} aria-disabled={t.noTime || undefined}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className={`title ${t.done ? 'done' : ''}`}>{t.title}</div>
                                        {(t.time || t.kind === 'always') && (
                                          <div className="meta">
                                            {t.time && <span>{clockTime(t.time, t.minutes)}</span>}
                                            {t.kind === 'always' && <span className="badge-soft">All-time</span>}
                                          </div>
                                        )}
                                        {t.noTime && <div className="no-time-msg">You don’t have enough time for this today</div>}
                                      </div>
                                      {t.minutes > 0 && <span className="time-chip" style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}>{mins(t.minutes)}</span>}
                                      {/* Tick on the right, like routine habits */}
                                      <Check done={t.done} color={t.noTime ? '#9a98a8' : group?.color || '#22c55e'} onToggle={() => toggleTodo(t)} />
                                    </div>
                                  </SwipeRow>
                                ))}
                              </AnimatePresence>
                            </div>
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
      <BecomingSheet open={becomingOpen} onClose={() => setBecomingOpen(false)} becoming={data?.wantToBe} date={date}
        onToggleHabit={toggleRoutine} onToggleAll={() => toggleHabit('wantToBe')} />
      <WeekChartSheet open={chartOpen} onClose={() => setChartOpen(false)} anchor={todayKey()} onPickDay={(d) => { setChartOpen(false); jump(d); }} />
    </div>
  );
});
