import { AnimatePresence, motion } from 'framer-motion';

// The app's movement, kept to the design language: a short rise and fade, nothing that bounces, loops or shakes.
// MotionConfig in _app turns movement off for people who asked for reduced motion (fades stay).
const EASE = [0.16, 1, 0.3, 1];

// Content that is swapped for other content (a tab's panel): the old one fades out, the new one rises in.
export function Swap({ id, children, className }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// One row of a list, arriving a little after the one before it (only the first dozen are staggered, so a long list is not slow).
export function Row({ index = 0, children, ...rest }) {
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: EASE, delay: Math.min(index, 12) * 0.025 }} {...rest}>
      {children}
    </motion.li>
  );
}

// A heading whose words change as you step through time (October 2026 to November 2026): the old one leaves and the new one
// arrives from the side you moved toward, so the direction is felt as well as read. dir is 1 (later) or -1 (earlier).
export function TitleSwap({ text, dir = 1, className }) {
  return (
    <span className={`relative inline-grid overflow-hidden align-bottom ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={text}
          custom={dir}
          className="block whitespace-nowrap"
          initial={{ opacity: 0, x: dir * 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -14 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// The raised white segment of a segmented control, sliding to the chosen item (shared layout animation). Put it first inside the
// chosen item; `id` keeps one control's segment apart from another's.
export function SegPill({ id }) {
  return (
    <motion.span
      layoutId={id}
      aria-hidden="true"
      className="absolute inset-0 rounded-md bg-surface"
      style={{ boxShadow: '0 1px 2px rgb(38 31 28 / 0.14), 0 0 0 0.5px rgb(38 31 28 / 0.1)' }}
      transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }}
    />
  );
}
