import { Check, Clock, SignIn, SignOut, Trash, XCircle } from '@phosphor-icons/react';
import { STATUS_LABEL } from '../lib/status';

// Status is shown with an icon as well as text, so it never depends on colour alone.
const ICON = { confirmed: Check, on_hold: Clock, checked_in: SignIn, checked_out: SignOut, cancelled: XCircle };

export default function StatusBadge({ status, deleted = false, children }) {
  const Icon = deleted ? Trash : ICON[status] ?? Check;
  return (
    <span className="badge gap-1">
      <Icon size={12} weight="bold" aria-hidden="true" className="shrink-0" />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
