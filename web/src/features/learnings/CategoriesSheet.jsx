// Manage categories: add, rename, change icon/colour, reorder (drag ⋮⋮), delete.
import { useEffect, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Trash2, Check as CheckIcon } from 'lucide-react';
import { Sheet, EmojiPicker, COLORS, LEARN_EMOJIS } from '../../components';
import ReorderRow from '../../components/ReorderRow.jsx';
import { buzz } from '../../lib';

const blank = { title: '', emoji: '🌱', color: COLORS[4] };

export default function CategoriesSheet({ open, onClose, store }) {
  const { categories, byCategory } = store;
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  useEffect(() => { if (open) { setF(blank); setEditId(null); setConfirmId(null); } }, [open]);

  const save = async () => {
    if (!f.title.trim()) return;
    buzz(18);
    if (editId) await store.editCategory(editId, { title: f.title.trim(), emoji: f.emoji, color: f.color });
    else await store.addCategory({ title: f.title.trim(), emoji: f.emoji, color: f.color });
    setF(blank); setEditId(null);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Categories">
      {categories?.length > 0 && (
        <Reorder.Group axis="y" values={categories} onReorder={store.reorderCategories} className="card list" style={{ listStyle: 'none', padding: 0, margin: '0 0 6px', boxShadow: 'none' }}>
          {categories.map((c) => (
            <ReorderRow key={c._id} value={c} onDrop={() => store.saveCategoryOrder(store.categories)}>
              <div className="emoji" style={{ background: `${c.color || '#7c3aed'}1f` }}>{c.emoji}</div>
              <button style={{ flex: 1, textAlign: 'left', minWidth: 0 }} onClick={() => { setEditId(c._id); setF({ title: c.title, emoji: c.emoji, color: c.color || COLORS[0] }); }}>
                <div className="title">{c.title}</div>
                <div className="meta">{byCategory.get(c._id)?.length || 0} learnings · tap to edit</div>
              </button>
              {confirmId === c._id ? (
                <button className="ghost-btn" style={{ background: '#e11d48', color: '#fff' }} onClick={() => { store.deleteCategory(c._id); setConfirmId(null); }}>Delete all</button>
              ) : (
                <button onClick={() => setConfirmId(c._id)} aria-label={`Delete ${c.title}`}><Trash2 size={16} color="#c4c2d0" /></button>
              )}
            </ReorderRow>
          ))}
        </Reorder.Group>
      )}
      {confirmId && <div className="tiny" style={{ color: '#e11d48', margin: '4px 4px 10px' }}>Deleting a category also deletes its {byCategory.get(confirmId)?.length || 0} learnings.</div>}

      <div className="section-label">{editId ? 'Edit category' : 'New category'}</div>
      <input className="input" placeholder="e.g. Life, Communication, Music" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label className="field-label">Icon</label>
      <EmojiPicker value={f.emoji} onChange={(e) => setF((x) => ({ ...x, emoji: e }))} options={LEARN_EMOJIS} />
      <label className="field-label">Colour</label>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        {COLORS.map((c) => <button key={c} className={`swatch ${f.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: editId ? '1fr auto' : '1fr', gap: 10, marginTop: 18 }}>
        <button className="primary-btn" onClick={save} disabled={!f.title.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <CheckIcon size={18} /> {editId ? 'Save category' : 'Add category'}
        </button>
        {editId && <button className="ghost-btn" style={{ height: 50 }} onClick={() => { setEditId(null); setF(blank); }}>Cancel</button>}
      </div>
    </Sheet>
  );
}
