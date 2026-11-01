import { useEffect, useState } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';
import { resolveTheme, useTheme } from '../lib/theme';

// Light or dark in one press, in the navbar. It shows the one you would switch to. Settings has the third choice (follow the device).
export default function ThemeToggle() {
  const [choice, setChoice] = useTheme();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(resolveTheme(choice) === 'dark'), [choice]);
  const Icon = dark ? Sun : Moon;
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className="btn btn-quiet btn-icon text-muted" onClick={() => setChoice(dark ? 'light' : 'dark')} aria-label={label} title={label}>
      <Icon size={20} weight="bold" />
    </button>
  );
}
