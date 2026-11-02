import { useRef } from 'react';

// A card that answers the pointer the way a foil trading card does: it leans a few degrees toward the cursor, lifts a little, and a soft
// glare and a faint rainbow foil follow the cursor across it. The shine depends on where the pointer is, not on a timer, so holding still holds
// it still. Mouse and pen only (a finger would tilt it by accident while scrolling),
// and none of it moves with "reduce motion". All of the drawing is CSS (.shine-card in globals.css); this only reports the pointer's place.
//   tilt: the largest lean in degrees    as: the element to draw (a section by default)
export default function ShineCard({ as: Tag = 'section', tilt = 4, className = '', style, children, ...rest }) {
  const ref = useRef(null);

  const move = (e) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(r.width, 1)));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / Math.max(r.height, 1)));
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    // Pushing the pointer right lifts the right edge away, so the card leans into the cursor.
    el.style.setProperty('--rx', `${((0.5 - y) * 2 * tilt).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 2 * tilt).toFixed(2)}deg`);
    el.dataset.hover = 'true';
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    delete el.dataset.hover;
  };

  return (
    <Tag ref={ref} onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave} className={`shine-card ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}
