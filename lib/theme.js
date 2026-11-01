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
    applyTheme(choice);
  }, [choice]);
  return [choice, setChoice];
}
