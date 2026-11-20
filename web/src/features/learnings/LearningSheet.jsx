// Detail page of one learning: title, description, category and the day it was added.
import { useState } from 'react';
import { Pencil, Trash2, CalendarDays } from 'lucide-react';
import { Sheet } from '../../components';
import { fmt } from '../../lib';

export default function LearningSheet({ learning, category, onClose, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const l = learning;
  return (
    <Sheet open={!!l} onClose={() => { setConfirm(false); onClose(); }}>
      {l && (
        <div>
          {category && (
            <span className="cat-pill" style={{ background: `${category.color || '#7c3aed'}1f`, color: category.color || 'var(--violet)' }}>
              {category.emoji} {category.title}
            </span>
          )}
          <h2 style={{ fontSize: 24, lineHeight: 1.25, margin: '12px 0 8px' }}>{l.title}</h2>
          <div className="row small muted" style={{ gap: 6 }}><CalendarDays size={15} /> Added {fmt(l.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div className="learning-body">{l.description?.trim() ? l.description : <span className="faint">No description yet.</span>}</div>
          {!confirm ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 20 }}>
              <button className="primary-btn" onClick={onEdit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Pencil size={17} /> Edit</button>
              <button className="icon-btn" style={{ width: 50, height: 50, borderRadius: 16, color: '#e11d48' }} onClick={() => setConfirm(true)} aria-label="Delete"><Trash2 size={19} /></button>
            </div>
          ) : (
            <div style={{ marginTop: 20 }}>
              <div className="small muted" style={{ textAlign: 'center', marginBottom: 10 }}>Delete this learning?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="ghost-btn" style={{ height: 48 }} onClick={() => setConfirm(false)}>Cancel</button>
                <button style={{ height: 48, borderRadius: 12, background: '#e11d48', color: '#fff', fontWeight: 700 }} onClick={() => { setConfirm(false); onDelete(); }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
