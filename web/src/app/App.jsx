import { memo, useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Sun, Repeat, Flag, Ellipsis, BookOpen, Sprout, X, UserRound, ChevronRight, ChevronUp, Scale, Rocket, Lightbulb, GraduationCap, RotateCcw } from 'lucide-react';
import { api, todayKey, addDays, fmt, buzz, mins, applyTheme } from '../lib';
import { Sheet, spring, soft, useToast, EMOJIS, TimePicker, EmojiPicker } from '../components';
import Home from '../features/today/TodayScreen.jsx';
import WeeklyHabitSheet from '../features/habits/WeeklyHabitSheet.jsx';
import AddTodoSheet from '../features/todos/AddTodoSheet.jsx';
import Account from '../features/account/AccountSheet.jsx';
// Loaded only the first time you open them, so the app starts with less code.
// memo: a kept-alive tab only re-renders when its own data/props change, not on every tab switch.
const Routine = lazy(() => import('../features/routine/RoutineScreen.jsx').then((m) => ({ default: memo(m.default) })));
const Learnings = lazy(() => import('../features/learnings/LearningsScreen.jsx').then((m) => ({ default: memo(m.default) })));
const Resolutions = lazy(() => import('../features/goals/ResolutionsScreen.jsx').then((m) => ({ default: memo(m.Resolutions) })));
const NeedsWants = lazy(() => import('../features/goals/NeedsWantsScreen.jsx').then((m) => ({ default: memo(m.NeedsWants) })));
const WantToBe = lazy(() => import('../features/goals/WantToBeScreen.jsx').then((m) => ({ default: memo(m.WantToBe) })));
const Insights = lazy(() => import('../features/goals/InsightsScreen.jsx').then((m) => ({ default: memo(m.Insights) })));

const TABS = [
  { id: 'home', label: 'Today', icon: Sun },
  { id: 'routine', label: 'Routine', icon: Repeat },
  { id: 'learnings', label: 'Learn', icon: BookOpen },
  { id: 'resolutions', label: 'Goals', icon: Flag },
  { id: 'more', label: 'More', icon: Ellipsis },
];
// short: what the More tab shows while you're on that page (the tab is narrow).
const MORE = [
  { id: 'needs', label: 'Needs vs Wants', short: 'Needs', icon: Scale },
  { id: 'wantToBe', label: 'Who I want to be', short: 'Future', icon: Rocket },
  { id: 'insights', label: 'Insights', short: 'Insights', icon: Lightbulb },
];
// Hidden tabs stay alive (state, data, scroll position kept) but the browser skips drawing them
// (content-visibility: hidden). Before, every visited tab was its own GPU layer (will-change), and a
// theme switch repainted all of them at once: the phone ran out of graphics memory and froze.
const HOME_SHOWN = { zIndex: 2 };
// (The visible screen sits on top and covers the whole area, so hidden ones never get taps.)
const HOME_HIDDEN = { zIndex: 0, contentVisibility: 'hidden' };
const SCREEN_SHOWN = HOME_SHOWN;
const SCREEN_HIDDEN = HOME_HIDDEN;
const OTHER_SCREENS = ['routine', 'learnings', 'resolutions', 'needs', 'wantToBe', 'insights'];

const ORDER = ['home', 'routine', 'learnings', 'resolutions', 'needs', 'wantToBe', 'insights'];

export default function App({ user = null, onSignOut = null }) {
  const [screen, setScreen] = useState('home');
  const [prev, setPrev] = useState('home');
  const [menu, setMenu] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [todoFor, setTodoFor] = useState(null);
  const [date, setDate] = useState(todayKey());
  const [refreshKey, setRefreshKey] = useState(0);
  // Each tab reloads its data every time you switch to it: its own visit counter goes up.
  const [visits, setVisits] = useState({});
  const keyFor = (id) => `${refreshKey}.${visits[id] || 0}`;
  const [counts, setCounts] = useState({});
  const [toast, setToast] = useToast();
  const [canReset, setCanReset] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // At the very top the colourful background shows behind the status bar; once you scroll, a soft strip fades in.
  const [scrolled, setScrolled] = useState(false);
  const onScroll = (e) => { const s = e.currentTarget.scrollTop > 6; if (s !== scrolled) setScrolled(s); };
  const homeScroll = useRef(null);
  const openWeekly = useCallback(() => setWeeklyOpen(true), []);
  // Tabs you've opened stay alive (hidden) so coming back is instant.
  const [visited, setVisited] = useState(() => new Set());
  useEffect(() => { if (screen !== 'home') setVisited((v) => (v.has(screen) ? v : new Set(v).add(screen))); }, [screen]);
  const scrollEls = useRef({});
  // When you switch tabs, the status strip matches the new screen's scroll position.
  useEffect(() => {
    const el = screen === 'home' ? homeScroll.current : scrollEls.current[screen];
    setScrolled((el?.scrollTop || 0) > 6);
  }, [screen]);
  useEffect(() => { api.get('/health').then((h) => setCanReset(!!h.canReset)).catch(() => {}); }, []);
  useEffect(() => { applyTheme(); }, []); // status-bar icons + widget follow the light / dark choice
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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

  const open = (id) => { buzz(8); setPrev(screen); setScreen(id); setMenu(false); setVisits((v) => ({ ...v, [id]: (v[id] || 0) + 1 })); };
  const dir = ORDER.indexOf(screen) >= ORDER.indexOf(prev) ? 1 : -1;
  // On a page from More, the More tab shows that page (icon + short name + a small up arrow).
  // Tapping any tab outside More switches back to "⋯ More".
  const moreItem = MORE.find((m) => m.id === screen);
  const activeTab = moreItem ? 'more' : screen;

  return (
    <div className="frame">
      <Blobs />
      {/* Soft fade behind the phone's status bar, so scrolled content doesn't clash with the clock */}
      <div className={`status-scrim ${scrolled ? 'on' : ''}`} />
      {/* Today stays alive while you visit other tabs (just hidden), so coming back is instant:
          no rebuild, no re-download, no replayed animations, same scroll position. */}
      <div className="scroll" ref={homeScroll} onScroll={onScroll} aria-hidden={screen !== 'home'}
        style={screen === 'home' ? HOME_SHOWN : HOME_HIDDEN}>
        <Home date={date} setDate={setDate} refreshKey={keyFor('home')} openWeekly={openWeekly} openAddTodo={setTodoFor} onCounts={setCounts} />
      </div>
      {/* Other tabs: built the first time you open them, then kept alive the same way as Today. */}
      {OTHER_SCREENS.filter((id) => visited.has(id) || id === screen).map((id) => (
        <div key={id} className="scroll" onScroll={onScroll} ref={(el) => { scrollEls.current[id] = el; }} aria-hidden={screen !== id}
          style={screen === id ? SCREEN_SHOWN : SCREEN_HIDDEN}>
          <Suspense fallback={<div className="card pulse" style={{ height: 220, marginTop: 70 }} />}>
            {id === 'routine' && <Routine onChanged={refresh} refreshKey={keyFor('routine')} />}
            {id === 'learnings' && <Learnings refreshKey={keyFor('learnings')} />}
            {id === 'resolutions' && <Resolutions refreshKey={keyFor('resolutions')} />}
            {id === 'needs' && <NeedsWants refreshKey={keyFor('needs')} />}
            {id === 'wantToBe' && <WantToBe onChanged={refresh} refreshKey={keyFor('wantToBe')} />}
            {id === 'insights' && <Insights onChanged={refresh} toast={setToast} active={screen === 'insights'} />}
          </Suspense>
        </div>
      ))}

      {/* Floating tab bar + habit-of-the-week button */}
      <div className="tabbar-wrap">
        <motion.nav className="tabbar" initial={{ y: 100 }} animate={{ y: 0 }} transition={{ ...soft, delay: 0.1 }}>
          {TABS.map((t) => {
            const on = activeTab === t.id;
            const badge = t.id === 'home' ? counts.routineLeft : null;
            const picked = t.id === 'more' ? moreItem : null;
            const Icon = picked ? picked.icon : t.icon;
            return (
              <button key={t.id} className={`tab ${on ? 'on' : ''}`} onClick={() => (t.id === 'more' ? setMenu(true) : open(t.id))}
                aria-label={picked ? `${picked.label} (from More)` : undefined}>
                <span className="tab-icon">
                  <Icon size={22} strokeWidth={on ? 2.3 : 1.8} />
                  {picked && <ChevronUp className="tab-up" size={13} strokeWidth={2.8} aria-hidden="true" />}
                </span>
                {picked ? <span className="tab-picked">{picked.short}</span> : t.label}
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
          <span className="sprout">
            <Sprout size={28} strokeWidth={2.1} color="#16a34a" />
          </span>
        </motion.button>
      </div>

      {/* More menu, like the popup in the screenshot */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div className="scrim" onClick={() => setMenu(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="menu" initial={{ opacity: 0, scale: 0.6, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.7, y: 20 }} transition={spring}>
              <button className="account" onClick={() => { setMenu(false); setAccountOpen(true); }}>
                {user?.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{user ? (user.name || '?')[0] : <UserRound size={20} />}</span>}
                <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <div className="bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user ? user.name : 'Account'}</div>
                  <div className="tiny faint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user ? user.email : 'Not signed in'}</div>
                </div>
                <ChevronRight size={18} color="currentColor" className="ic-3" />
              </button>
              {MORE.map((m, i) => (
                <motion.button key={m.id} onClick={() => open(m.id)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <m.icon size={21} strokeWidth={1.7} color="currentColor" className="ic-2" /> {m.label}
                </motion.button>
              ))}
              <motion.button onClick={() => { setMenu(false); setWeeklyOpen(true); }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
                <GraduationCap size={21} strokeWidth={1.7} color="currentColor" className="ic-2" /> Habit of the week
              </motion.button>
{canReset && (
              <motion.button onClick={async () => { await api.post('/reset'); setMenu(false); refresh(); setToast('Demo data restored'); open('home'); }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 }}>
                <RotateCcw size={21} strokeWidth={1.7} color="currentColor" className="ic-2" /> Reset demo data
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

      <Account open={accountOpen} onClose={() => setAccountOpen(false)} user={user} onSignOut={onSignOut} />
      <WeeklyHabitSheet open={weeklyOpen} onClose={() => setWeeklyOpen(false)} onChanged={refresh} toast={setToast} />
      <AddTodoSheet target={todoFor} onClose={() => setTodoFor(null)} onSaved={(d) => { setTodoFor(null); if (screen === 'home') setDate(d); refresh(); setToast('To-do added ✓'); }} />
      {toast}
    </div>
  );
}

// Soft colour background (styles.css .blobs): painted once, no animation, smooth on phones.
function Blobs() {
  return <div className="blobs" />;
}

