import { ArrowUUpLeft } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { fmtDateTime } from '../../lib/dates';
import { ACTION_LABEL } from './bookingOptions';

// Who created, edited, deleted or restored the booking, and when (newest first).
export default function HistoryList({ history }) {
  if (history.length === 0) return null;
  return (
    <div>
      <FieldLabel as="span" icon={ArrowUUpLeft}>History ({history.length})</FieldLabel>
      <ul className="divide-y divide-line rounded-lg border border-line text-sm">
        {history.map((h) => (
          <li key={h.id} className="flex justify-between gap-3 px-3 py-1.5">
            <span>{ACTION_LABEL[h.action] ?? h.action}{h.changed_by ? ` by ${h.changed_by}` : ''}</span>
            <span className="shrink-0 text-muted">{fmtDateTime(h.changed_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
