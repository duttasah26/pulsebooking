import { Moon, User } from '@phosphor-icons/react';

// A count shown as an icon and the number with a times sign: a moon and 4× for four nights, a person and 2× for two guests. Short enough for a bar or a
// list row; the screen reader hears the full words ("4 nights"), and hovering shows them too.
//   kind: 'nights' | 'guests'    n: the number    size: icon size in px    title: replaces the hover text (for "2 adults, 1 child")
const KINDS = { nights: { Icon: Moon, one: 'night', many: 'nights' }, guests: { Icon: User, one: 'guest', many: 'guests' } };

export default function Count({ kind, n, size = 16, title, className = '' }) {
  const { Icon, one, many } = KINDS[kind];
  const words = `${n} ${n === 1 ? one : many}`;
  return (
    <span title={title ?? words} className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${className}`}>
      <Icon size={size} aria-hidden="true" />
      <span aria-hidden="true" className="font-mono">{n}×</span>
      <span className="sr-only">{words}</span>
    </span>
  );
}
