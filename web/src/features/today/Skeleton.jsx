import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, todayKey, addDays, fmt, mins, fromKey, toKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, spring, soft } from '../../components';


export default function Skeleton() {
  return (
    <div>
      {[128, 120, 300].map((h, i) => (
        <div key={i} className="card pulse" style={{ height: h, marginTop: 12 }} />
      ))}
    </div>
  );
}
