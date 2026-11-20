import { buzz } from '../lib';

// Segmented control with a sliding white pill (like "My tasks | Team").
// The pill is one plain element moved with a CSS transform. It used to be a framer-motion
// shared-layout pill (layoutId): inside a bottom sheet, once the pill had moved, closing the
// sheet left it on the page as an invisible layer that swallowed every tap (the app looked frozen).
// `layoutId` is still accepted from callers but no longer used.
// eslint-disable-next-line no-unused-vars
export function Segmented({ options, value, onChange, layoutId }) {
  const at = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="seg">
      <span className="seg-pill" aria-hidden="true"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${at * 100}%)` }} />
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => { buzz(6); onChange(o.value); }}>
          {o.label}{o.count != null && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
