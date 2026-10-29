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
