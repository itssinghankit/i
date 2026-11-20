import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Repeat, Flag, Ellipsis, Sprout, X, LogOut, Scale, Rocket, Lightbulb, GraduationCap, RotateCcw } from 'lucide-react';
import { api, todayKey, addDays, fmt, buzz, mins } from './api';
import { Sheet, spring, soft, useToast, EMOJIS, TimePicker } from './ui';
import Home from './screens/Home';
import Routine from './screens/Routine';
import { Resolutions, NeedsWants, WantToBe, Insights } from './screens/Goals';

const TABS = [
  { id: 'home', label: 'Today', icon: Sun },
  { id: 'routine', label: 'Routine', icon: Repeat },
  { id: 'resolutions', label: 'Goals', icon: Flag },
  { id: 'more', label: 'More', icon: Ellipsis },
];
const MORE = [
  { id: 'needs', label: 'Needs vs Wants', icon: Scale },
  { id: 'wantToBe', label: 'Who I want to be', icon: Rocket },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];
const ORDER = ['home', 'routine', 'resolutions', 'needs', 'wantToBe', 'insights'];

export default function App({ user = null, onSignOut = null }) {
  const [screen, setScreen] = useState('home');
  const [prev, setPrev] = useState('home');
  const [menu, setMenu] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [todoFor, setTodoFor] = useState(null);
  const [date, setDate] = useState(todayKey());
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState({});
  const [toast, setToast] = useToast();
  const [canReset, setCanReset] = useState(false);
  useEffect(() => { api.get('/health').then((h) => setCanReset(!!h.canReset)).catch(() => {}); }, []);
  const refresh = () => setRefreshKey((k) => k + 1);

  // Deep links from the Android widget: #add-todo opens the add sheet, #home goes to today.
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h === 'add-todo') { setScreen('home'); setTodoFor({ date: todayKey() }); }
      if (h === 'home') { setScreen('home'); setDate(todayKey()); }
      if (h) history.replaceState(null, '', ' ');
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    window.iRefresh = refresh; // Android calls this when the app comes back to the front
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const open = (id) => { buzz(8); setPrev(screen); setScreen(id); setMenu(false); };
  const dir = ORDER.indexOf(screen) >= ORDER.indexOf(prev) ? 1 : -1;
  const activeTab = ['needs', 'wantToBe', 'insights'].includes(screen) ? 'more' : screen;

  return (
    <div className="frame">
      <Blobs />
      <div className="scroll" key={screen}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={screen} initial={{ opacity: 0, x: dir * 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -28 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
            {screen === 'home' && <Home date={date} setDate={setDate} refreshKey={refreshKey} openWeekly={() => setWeeklyOpen(true)} openAddTodo={setTodoFor} onCounts={setCounts} />}
            {screen === 'routine' && <Routine onChanged={refresh} />}
            {screen === 'resolutions' && <Resolutions />}
            {screen === 'needs' && <NeedsWants />}
            {screen === 'wantToBe' && <WantToBe onChanged={refresh} />}
            {screen === 'insights' && <Insights onChanged={refresh} toast={setToast} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating tab bar + habit-of-the-week button */}
      <div className="tabbar-wrap">
        <motion.nav className="tabbar" initial={{ y: 100 }} animate={{ y: 0 }} transition={{ ...soft, delay: 0.1 }}>
          {TABS.map((t) => {
            const on = activeTab === t.id;
            const badge = t.id === 'home' ? counts.routineLeft : null;
            const Icon = t.icon;
            return (
              <button key={t.id} className={`tab ${on ? 'on' : ''}`} onClick={() => (t.id === 'more' ? setMenu(true) : open(t.id))}>
                {on && <motion.span layoutId="tabBg" className="tab-bg" transition={spring} />}
                <motion.span animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }} transition={spring}><Icon size={22} strokeWidth={on ? 2.3 : 1.8} /></motion.span>
                {t.label}
                <AnimatePresence>
                  {badge > 0 && (
                    <motion.span key={badge} className="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}>{badge}</motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </motion.nav>
        <motion.button className="fab" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.2 }}
          whileTap={{ scale: 0.88, rotate: 20 }} onClick={() => { buzz(10); setWeeklyOpen(true); }} aria-label="Habit of the week">
          {/* A sprout = a habit growing. It "grows" a little every few seconds. */}
          <motion.span style={{ display: 'grid', transformOrigin: '50% 90%' }}
            animate={{ scaleY: [1, 1.18, 0.95, 1], rotate: [0, -6, 4, 0] }} transition={{ repeat: Infinity, repeatDelay: 3, duration: 1.1 }}>
            <Sprout size={28} strokeWidth={2.1} color="#16a34a" />
          </motion.span>
        </motion.button>
      </div>

      {/* More menu, like the popup in the screenshot */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div className="scrim" onClick={() => setMenu(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="menu" initial={{ opacity: 0, scale: 0.6, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.7, y: 20 }} transition={spring}>
              {user && (
                <div className="account">
                  {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{(user.name || '?')[0]}</span>}
                  <div style={{ minWidth: 0 }}>
                    <div className="bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                    <div className="tiny faint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                  </div>
                </div>
              )}
              {MORE.map((m, i) => (
                <motion.button key={m.id} onClick={() => open(m.id)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <m.icon size={21} strokeWidth={1.7} color="#5d5b6b" /> {m.label}
                </motion.button>
              ))}
              <motion.button onClick={() => { setMenu(false); setWeeklyOpen(true); }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
                <GraduationCap size={21} strokeWidth={1.7} color="#5d5b6b" /> Habit of the week
              </motion.button>
{canReset && (
              <motion.button onClick={async () => { await api.post('/reset'); setMenu(false); refresh(); setToast('Demo data restored'); open('home'); }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 }}>
                <RotateCcw size={21} strokeWidth={1.7} color="#5d5b6b" /> Reset demo data
              </motion.button>
              )}
              {onSignOut && (
                <motion.button onClick={() => { setMenu(false); onSignOut(); }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ color: '#e11d48' }}>
                  <LogOut size={21} strokeWidth={1.7} /> Sign out
                </motion.button>
              )}
              <div className="between" style={{ padding: '4px 4px 0 14px' }}>
                <span className="tiny faint">i · by itssinghankit</span>
                <button className="close" onClick={() => setMenu(false)} aria-label="Close menu"><X size={22} /></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <WeeklyHabitSheet open={weeklyOpen} onClose={() => setWeeklyOpen(false)} onChanged={refresh} toast={setToast} />
      <AddTodoSheet target={todoFor} onClose={() => setTodoFor(null)} onSaved={(d) => { setTodoFor(null); if (screen === 'home') setDate(d); refresh(); setToast('To-do added ✓'); }} />
      {toast}
    </div>
  );
}

// Slowly drifting colour blobs in the background.
function Blobs() {
  const blobs = [
    { c: '#c4b5fd', x: [-80, -40, -80], y: [-120, -80, -120] },
    { c: '#fbcfe8', x: [220, 180, 220], y: [-60, -100, -60] },
    { c: '#fed7aa', x: [160, 220, 160], y: [520, 470, 520] },
    { c: '#a5f3fc', x: [-120, -60, -120], y: [380, 440, 380] },
  ];
  return (
    <div className="blobs">
      {blobs.map((b, i) => (
        <motion.div key={i} className="blob" style={{ background: b.c }} animate={{ x: b.x, y: b.y }} transition={{ repeat: Infinity, duration: 14 + i * 3, ease: 'easeInOut' }} />
      ))}
    </div>
  );
}

// Habit of the week: one new habit to practise for 7 days, then graduate into the routine.
function WeeklyHabitSheet({ open, onClose, onChanged, toast }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState([]);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: '', emoji: '✨', minutes: 10 });
  const load = async () => {
    const d = await api.get('/weeklyHabits');
    setData(d);
    const wk = await Promise.all(Array.from({ length: 7 }, (_, i) => api.get(`/day/${addDays(d.currentWeek, i)}`)));
    setDays(wk.map((x) => ({ date: x.date, done: x.weeklyHabit?.done })));
  };
  useEffect(() => { if (open) { setEditing(false); load(); } }, [open]);
  const current = data?.habits.find((h) => h.weekStart === data.currentWeek);
  const past = data?.habits.filter((h) => h.weekStart !== data.currentWeek) || [];
  const save = async () => {
    if (!f.title.trim()) return;
    await api.post('/weeklyHabits', { title: f.title.trim(), emoji: f.emoji, minutes: f.minutes });
    buzz(25); setEditing(false); load(); onChanged();
  };
  const toggleDay = async (d) => {
    if (d.date > todayKey()) return;
    setDays((x) => x.map((y) => (y.date === d.date ? { ...y, done: !y.done } : y)));
    await api.post(`/day/${d.date}/toggle`, { kind: 'weekly' }); onChanged();
  };
  const graduate = async (h) => { await api.post(`/weeklyHabits/${h._id}/graduate`, { minutes: 10 }); toast('Added to your daily routine 🎓'); load(); onChanged(); };
  const doneCount = days.filter((d) => d.done).length;

  return (
    <Sheet open={open} onClose={onClose} title="Habit of the week">
      {current && !editing ? (
        <motion.div className="habit" style={{ background: 'linear-gradient(140deg,#7c3aed,#c026d3 60%,#ec4899)', minHeight: 0 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="shine" />
          <div className="kicker">Week of {fmt(data.currentWeek, { day: 'numeric', month: 'short' })} · {doneCount}/7 days{current.minutes ? ` · ${mins(current.minutes)}/day` : ''}</div>
          <div className="h-title" style={{ fontSize: 22 }}>{current.emoji} {current.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginTop: 14 }}>
            {days.map((d, i) => (
              <motion.button key={d.date} onClick={() => toggleDay(d)} whileTap={{ scale: 0.85 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: d.date > todayKey() ? 0.45 : 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ borderRadius: 12, padding: '8px 0', background: d.done ? '#fff' : 'rgba(255,255,255,.18)', color: d.done ? '#a21caf' : '#fff', fontWeight: 700, fontSize: 12 }}>
                {fmt(d.date, { weekday: 'narrow' })}<div style={{ fontSize: 15 }}>{d.done ? '✓' : '·'}</div>
              </motion.button>
            ))}
          </div>
          <button className="ghost-btn" style={{ marginTop: 14, background: 'rgba(255,255,255,.22)', color: '#fff', alignSelf: 'flex-start' }} onClick={() => { setF({ title: current.title, emoji: current.emoji, minutes: current.minutes || 10 }); setEditing(true); }}>Change this week’s habit</button>
        </motion.div>
      ) : (
        <div>
          <p className="small muted" style={{ marginTop: 0 }}>Pick one small habit to practise every day this week. If it sticks (5+ days), add it to your routine.</p>
          <input className="input" autoFocus placeholder="e.g. No sugar after 6 PM" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6, marginTop: 10 }}>
            {EMOJIS.map((e) => <button key={e} className={`emoji-pick ${f.emoji === e ? 'on' : ''}`} onClick={() => setF({ ...f, emoji: e })}>{e}</button>)}
          </div>
          <div className="small bold" style={{ margin: '14px 2px 8px' }}>Time it takes each day</div>
          <TimePicker value={f.minutes} onChange={(m) => setF((x) => ({ ...x, minutes: m }))} presets={[5, 10, 15, 30, 45, 60]} max={4 * 60} />
          <div className="small bold" style={{ margin: '14px 2px 8px' }}>Ideas</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {['Drink 3L water', 'No screens in bed', 'Gratitude: 3 things', '5-minute tidy-up', 'Walk after lunch', 'Read 10 pages'].map((s) => (
              <button key={s} className="ghost-btn" onClick={() => setF({ ...f, title: s })}>{s}</button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 18 }} onClick={save}>Set for this week</motion.button>
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="section-label">Past weeks</div>
          <div className="card list">
            {past.map((h) => (
              <div key={h._id} className="item">
                <span style={{ fontSize: 20 }}>{h.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{h.title}</div>
                  <div className="meta">Week of {fmt(h.weekStart, { day: 'numeric', month: 'short' })}</div>
                </div>
                <div className="bold small" style={{ color: h.daysDone >= 5 ? '#16a34a' : '#f97316' }}>{h.daysDone}/7</div>
                {h.addedToRoutine
                  ? <span className="tiny faint">In routine</span>
                  : <button className="ghost-btn" onClick={() => graduate(h)}>+ Routine</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

function AddTodoSheet({ target, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [minutes, setMinutes] = useState(15);
  const [containers, setContainers] = useState([]);
  useEffect(() => {
    if (!target) return;
    setTitle(''); setWhen(target.date); setParentId(target.parentId || null); setMinutes(15);
  }, [target]);
  // Which routine items can hold to-dos on that day (e.g. Office work on weekdays)?
  useEffect(() => {
    if (!target || !when) return;
    api.get(`/day/${when}`).then((d) => {
      const c = d.routine.filter((r) => r.holdsTodos);
      setContainers(c);
      setParentId((p) => (p && !c.some((x) => x._id === p) ? null : p));
    });
  }, [target, when]);
  const t = todayKey();
  const save = async (e) => {
    e?.preventDefault();
    if (!title.trim()) return;
    await api.post('/todos', { title: title.trim(), date: when, parentId, minutes: parentId ? 0 : minutes });
    buzz(20); onSaved(when);
  };
  const dates = target ? [[t, 'Today'], [addDays(t, 1), 'Tomorrow'], ...(target.date !== t && target.date !== addDays(t, 1) ? [[target.date, fmt(target.date, { day: 'numeric', month: 'short' })]] : [])] : [];
  const on = { background: '#ede9fe', color: 'var(--violet)' };
  return (
    <Sheet open={!!target} onClose={onClose} title="New to-do">
      <form onSubmit={save}>
        <input className="input" autoFocus placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="field-label">When</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {dates.map(([d, label]) => (
            <button type="button" key={d} className="ghost-btn" style={when === d ? on : undefined} onClick={() => setWhen(d)}>{label}</button>
          ))}
        </div>
        <label className="field-label">Where does it go?</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {containers.map((c) => (
            <button type="button" key={c._id} className="ghost-btn" style={parentId === c._id ? on : undefined} onClick={() => setParentId(c._id)}>
              {c.emoji} Inside {c.title}
            </button>
          ))}
          <button type="button" className="ghost-btn" style={!parentId ? on : undefined} onClick={() => setParentId(null)}>✅ Standalone</button>
        </div>
        <AnimatePresence initial={false}>
          {!parentId ? (
            <motion.div key="m" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <label className="field-label">How long will it take? (added to your day plan)</label>
              <TimePicker value={minutes} onChange={setMinutes} presets={[10, 15, 30, 45, 60]} max={12 * 60} />
            </motion.div>
          ) : (
            <motion.div key="n" className="tiny faint" style={{ marginTop: 10 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              No extra time: it fits inside {containers.find((c) => c._id === parentId)?.title}’s fixed hours.
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 18 }}>Add to-do</motion.button>
      </form>
    </Sheet>
  );
}
