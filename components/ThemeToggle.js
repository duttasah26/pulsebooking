import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../lib/theme';

// The one appearance control, in the navbar: each press goes to the next of Light, Dark and System (follow the device). It shows the one in use.
const NEXT = { light: 'dark', dark: 'system', system: 'light' };
const WORD = { light: 'Light', dark: 'Dark', system: 'System' };
const ICON = { light: Sun, dark: Moon, system: Desktop };

export default function ThemeToggle() {
  const [choice, setChoice] = useTheme();
  const Icon = ICON[choice] ?? Desktop;
  const label = `Appearance: ${WORD[choice] ?? 'System'}. Switch to ${WORD[NEXT[choice] ?? 'light']}`;
  return (
    <button type="button" className="btn btn-quiet btn-icon text-muted" onClick={() => setChoice(NEXT[choice] ?? 'light')} aria-label={label} title={label}>
      <Icon size={20} weight="bold" />
    </button>
  );
}
