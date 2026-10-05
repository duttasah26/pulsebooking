import { Check, Clock, SignIn, SignOut, Trash, XCircle } from '@phosphor-icons/react';
import { STATUS_LABEL } from '../lib/status';

// Status is shown with an icon as well as text, so it never depends on colour alone. The colours match the calendar:
// Confirmed green, On hold amber (dashed edge), Checked in solid green, Checked out grey, Cancelled and Deleted red.
export const STATUS_ICON = { confirmed: Check, on_hold: Clock, checked_in: SignIn, checked_out: SignOut, cancelled: XCircle };
const TONE = {
  confirmed: 'border-accent/50 bg-accent-soft text-accent-text',
  on_hold: 'border-dashed border-amber-400 bg-amber-100 text-amber-800',
  checked_in: 'border-accent bg-accent text-accent-ink',
  checked_out: 'border-line bg-surface-2 text-muted',
  cancelled: 'border-danger/50 bg-danger/10 text-danger',
  deleted: 'border-danger/50 bg-danger/10 text-danger',
};

export default function StatusBadge({ status, deleted = false, children }) {
  const Icon = deleted ? Trash : STATUS_ICON[status] ?? Check;
  const tone = TONE[deleted ? 'deleted' : status] ?? TONE.checked_out;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm font-semibold ${tone}`}>
      <Icon size={14} weight="bold" aria-hidden="true" className="shrink-0" />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
