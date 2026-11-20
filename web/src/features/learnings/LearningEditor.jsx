// Add / edit a learning: title, description and category.
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from '../../components';
import { buzz } from '../../lib';

export default function LearningEditor({ value, categories, onClose, onSave, onNewCategory }) {
  const [f, setF] = useState({ title: '', description: '', categoryId: '' });
  useEffect(() => { if (value) setF({ title: value.title || '', description: value.description || '', categoryId: value.categoryId || categories[0]?._id || '' }); }, [value]);
  const isNew = !value?._id;
  const save = async () => {
    if (!f.title.trim() || !f.categoryId) return;
    buzz(18);
    const data = { title: f.title.trim(), description: f.description.trim(), ...(isNew || f.categoryId !== value.categoryId ? { categoryId: f.categoryId } : {}) };
    await onSave(isNew ? { ...data, categoryId: f.categoryId } : data);
  };
  return (
    <Sheet open={!!value} onClose={onClose} title={isNew ? 'New learning' : 'Edit learning'}>
      <label className="field-label">What did you learn?</label>
      <input className="input" data-autofocus placeholder="e.g. Listen to understand" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label className="field-label">Details</label>
      <textarea className="input textarea" placeholder="What happened, why it matters, how to use it…" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <label className="field-label">Category</label>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {categories.map((c) => (
          <button key={c._id} type="button" className={`chip ${f.categoryId === c._id ? 'on' : ''}`} style={f.categoryId === c._id ? { background: c.color || 'var(--violet)' } : undefined} onClick={() => setF({ ...f, categoryId: c._id })}>
            {c.emoji} {c.title}
          </button>
        ))}
        <button type="button" className="chip ghost" onClick={onNewCategory}><Plus size={14} /> New category</button>
      </div>
      <button className="primary-btn" style={{ marginTop: 20 }} onClick={save} disabled={!f.title.trim()}>{isNew ? 'Save learning' : 'Save changes'}</button>
    </Sheet>
  );
}
