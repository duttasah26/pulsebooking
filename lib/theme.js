import { useEffect } from 'react';
import { useStoredState } from './useStoredState';

// Light, dark, or follow the device. The choice is kept on this device. pages/_document.js applies it before the first paint (so a
// dark page never flashes white); this hook is for the Settings control and keeps the page in step when the choice or the system changes.
export const THEMES = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];
export const THEME_KEY = 'pulse.theme';

export const resolveTheme = (choice) => (choice === 'dark' || choice === 'light' ? choice : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function applyTheme(choice) {
  const theme = resolveTheme(choice);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0a09' : '#ffffff');
}

// Whole-app: keeps the page following the system while the choice is System. Returns the cleanup.
export function watchSystemTheme() {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    let choice = 'system';
    try { choice = localStorage.getItem(THEME_KEY) ?? 'system'; } catch {}
    if (choice === 'system') applyTheme('system');
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function useTheme() {
  const [choice, setChoice] = useStoredState(THEME_KEY, 'system', { parse: (raw) => (['system', 'light', 'dark'].includes(raw) ? raw : undefined) });
  useEffect(() => {
    // On the first pass `choice` is still the "System" placeholder (the saved value is read just after), and applying that on a device set to dark
    // turned a light page dark for a moment on every load. The saved choice is always current in storage (it is written as it is set), so use it.
    let now = choice;
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'system' || saved === 'light' || saved === 'dark') now = saved;
    } catch {}
    applyTheme(now);
  }, [choice]);
  // A press on the toggle (or the Settings choice) cross-fades the whole page slowly instead of snapping; where the browser has no view
  // transitions, or the person asked for reduced motion, it just switches.
  const change = (next) => {
    const run = () => {
      applyTheme(next);
      setChoice(next);
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition === 'function' && !reduce && resolveTheme(next) !== document.documentElement.dataset.theme) document.startViewTransition(run);
    else run();
  };
  return [choice, change];
}
