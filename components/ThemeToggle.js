import { useEffect, useState } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';
import { resolveTheme, useTheme } from '../lib/theme';

// The one appearance control, in the navbar. Every press flips what you see (light to dark, dark to light), so no press is wasted on a choice that
// looks the same. When the result is what the device itself is set to, it is saved as "System" (follow the device), so following the device
// stays reachable without a tap of its own. The icon is the one you will get.
export default function ThemeToggle() {
  const [choice, setChoice] = useTheme();
  const [shown, setShown] = useState('light'); // what is on screen now
  useEffect(() => setShown(resolveTheme(choice)), [choice]);
  const next = shown === 'dark' ? 'light' : 'dark';
  const device = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const Icon = next === 'light' ? Sun : Moon;
  const label = `Switch to ${next} mode`;
  return (
    <button type="button" className="btn btn-quiet btn-icon text-muted" onClick={() => setChoice(next === device ? 'system' : next)} aria-label={label} title={label}>
      <Icon size={20} weight="bold" className={next === 'light' ? 'ico-sun' : 'ico-moon'} />
    </button>
  );
}
