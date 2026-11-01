import { Check, Clock, SignIn, SignOut, Trash, XCircle } from '@phosphor-icons/react';
import { STATUS_LABEL } from '../lib/status';

// Status is shown with an icon as well as text, so it never depends on colour alone. The colours match the calendar:
// Confirmed green, On hold straw (dashed edge), Checked in solid green, Checked out grey, Cancelled and Deleted red.
export const STATUS_ICON = { confirmed: Check, on_hold: Clock, checked_in: SignIn, checked_out: SignOut, cancelled: XCircle };
// A badge often sits on a coloured card, and in dark the soft fills are see-through tints, so each one is laid over the page surface first:
// the badge keeps its own clean colour whatever is under it (in light the fills are solid, so nothing changes).
const over = (token) => `bg-surface dark:bg-surface/70 bg-[image:linear-gradient(var(--${token}),var(--${token}))]`;
const TONE = {
  confirmed: `border-transparent ${over('ok-soft')} text-ok-text`,
  on_hold: `border-dashed border-hold-edge ${over('hold')} text-hold-ink`,
  checked_in: 'border-transparent bg-accent text-accent-ink',
  checked_out: 'border-transparent bg-surface-2 text-muted',
  cancelled: `border-transparent ${over('danger-soft')} text-danger`,
  deleted: `border-transparent ${over('danger-soft')} text-danger`,
};

export default function StatusBadge({ status, deleted = false, children }) {
  const Icon = deleted ? Trash : STATUS_ICON[status] ?? Check;
  const tone = TONE[deleted ? 'deleted' : status] ?? TONE.checked_out;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm font-semibold leading-5 transition-colors duration-300 ${tone}`}>
      <Icon size={14} weight="bold" aria-hidden="true" className="shrink-0" />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
