// A list row you can reorder by dragging ONLY its ⋮⋮ handle; the rest of the row scrolls and taps normally.
// Use inside <Reorder.Group>. Imported directly (not via components/index.js) so its drag code only
// loads with the screens that need it.
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { buzz } from '../lib';

export default function ReorderRow({ value, onDrop, className = 'item', style, children }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={value} className={className} style={style} dragListener={false} dragControls={controls} onDragEnd={onDrop}
      whileDrag={{ scale: 1.03, boxShadow: '0 12px 30px rgba(0,0,0,.15)', zIndex: 5 }}>
      <span className="drag-handle" aria-label="Drag to reorder" onPointerDown={(e) => { buzz(8); controls.start(e); }}>
        <GripVertical size={18} color="#a5a3b3" />
      </span>
      {children}
    </Reorder.Item>
  );
}
