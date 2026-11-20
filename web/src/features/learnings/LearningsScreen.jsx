// Learnings tab: titles grouped by category. Tap a title to open it; drag ⋮⋮ to reorder inside a category.
import { useState } from 'react';
import { m as motion, Reorder } from 'framer-motion';
import { Plus, Tags, ChevronRight } from 'lucide-react';
import { Empty } from '../../components';
import ReorderRow from '../../components/ReorderRow.jsx';
import { useLearnings } from './useLearnings.js';
import LearningSheet from './LearningSheet.jsx';
import LearningEditor from './LearningEditor.jsx';
import CategoriesSheet from './CategoriesSheet.jsx';

export default function LearningsScreen({ refreshKey }) {
  const store = useLearnings(refreshKey);
  const { categories, byCategory, learnings } = store;
  const [filter, setFilter] = useState('all');   // 'all' or a category id
  const [openId, setOpenId] = useState(null);    // learning shown in the detail sheet
  const [editing, setEditing] = useState(null);  // null = closed, {} = new, learning = edit
  const [manage, setManage] = useState(false);

  const shown = (categories || []).filter((c) => filter === 'all' || c._id === filter);
  const open = learnings.find((l) => l._id === openId) || null;

  return (
    <div>
      <div className="between" style={{ marginBottom: 6 }}>
        <div>
          <div className="small muted bold">What life taught me</div>
          <h1>Learnings</h1>
        </div>
        <motion.button whileTap={{ scale: 0.88 }} className="icon-btn" style={{ width: 46, height: 46, background: 'var(--grad)', color: '#fff', border: 0 }}
          onClick={() => (categories?.length ? setEditing({ categoryId: filter !== 'all' ? filter : categories[0]._id }) : setManage(true))} aria-label="Add learning">
          <Plus size={22} />
        </motion.button>
      </div>

      {/* Category filter chips + manage categories */}
      <div className="chips-row">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All <span className="chip-count">{learnings.length}</span></button>
        {(categories || []).map((c) => (
          <button key={c._id} className={`chip ${filter === c._id ? 'on' : ''}`} style={filter === c._id ? { background: c.color || 'var(--violet)' } : undefined} onClick={() => setFilter(c._id)}>
            {c.emoji} {c.title} <span className="chip-count">{byCategory.get(c._id)?.length || 0}</span>
          </button>
        ))}
        <button className="chip ghost" onClick={() => setManage(true)} aria-label="Manage categories"><Tags size={15} /> Categories</button>
      </div>

      {categories && categories.length === 0 && (
        <Empty emoji="📒" text="Start with a category, like Life or Communication." />
      )}

      {shown.map((c) => {
        const list = byCategory.get(c._id) || [];
        return (
          <section key={c._id}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cat-dot" style={{ background: c.color || 'var(--violet)' }} />{c.emoji} {c.title} · {list.length}
            </div>
            {list.length === 0 ? (
              <button className="card add-first" onClick={() => setEditing({ categoryId: c._id })}><Plus size={16} /> Add your first {c.title.toLowerCase()} learning</button>
            ) : (
              <Reorder.Group axis="y" values={list} onReorder={(next) => store.reorderIn(c._id, next)} className="card list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {list.map((l, i) => (
                  <ReorderRow key={l._id} value={l} className="item rise" style={{ '--i': i }} onDrop={() => store.saveOrderIn(c._id, byCategory.get(c._id) || [])}>
                    <button className="learning-title" onClick={() => setOpenId(l._id)}>{l.title}</button>
                    <ChevronRight size={18} color="currentColor" className="ic-4" />
                  </ReorderRow>
                ))}
              </Reorder.Group>
            )}
          </section>
        );
      })}

      <LearningSheet learning={open} category={open && categories?.find((c) => c._id === open.categoryId)}
        onClose={() => setOpenId(null)} onEdit={() => { setEditing(open); setOpenId(null); }}
        onDelete={async () => { await store.remove(open._id); setOpenId(null); }} />
      <LearningEditor value={editing} categories={categories || []} onClose={() => setEditing(null)}
        onSave={async (data) => { if (editing?._id) await store.edit(editing._id, data); else await store.add(data); setEditing(null); }}
        onNewCategory={() => { setEditing(null); setManage(true); }} />
      <CategoriesSheet open={manage} onClose={() => setManage(false)} store={store} />
    </div>
  );
}
