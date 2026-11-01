import { Bed, Moon, SignIn, SignOut } from '@phosphor-icons/react';
import CountTo from '../CountTo';

// Arrivals, departures and stays at a glance, as one plain line (nothing to press, so nothing that looks like a button).
// It says what it counts (Today, a day you clicked, a room you clicked, or both), then how many rooms are in use out of all of
// them, with the room nights sold so far this month under it. One small tile: the label on the left, the lines beside it. Arriving and leaving only appear when there is one, so a quiet day is one short line, not three zeros.
// The icons are the same ones the calendar uses for check-in (green) and check-out (brick).
export default function TodaySummary({ label, arriving, leaving, staying, total, monthNights, monthName }) {
  const part = (Icon, tone, text) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon size={18} aria-hidden="true" className={tone} />
      {text}
    </span>
  );
  return (
    <div className="inline-flex items-center gap-4 rounded-lg bg-surface-2 px-4 py-2 text-[0.9375rem] text-muted">
      <span className="shrink-0 self-stretch whitespace-nowrap border-r border-line pr-4 flex items-center font-semibold text-ink">{label}</span>
      <div className="space-y-1">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {part(Bed, 'text-muted', total ? <><span className="font-mono text-base font-semibold text-ink"><CountTo value={staying} /></span> of {total} rooms in use</> : <><span className="font-mono text-base font-semibold text-ink"><CountTo value={staying} /></span> staying</>)}
          {arriving > 0 && part(SignIn, 'text-accent-text', <><span className="font-mono text-base font-semibold text-ink"><CountTo value={arriving} /></span> arriving</>)}
          {leaving > 0 && part(SignOut, 'text-danger', <><span className="font-mono text-base font-semibold text-ink"><CountTo value={leaving} /></span> leaving</>)}
        </p>
        {monthNights != null && (
          <p>{part(Moon, 'text-muted', <><span className="font-mono text-base font-semibold text-ink"><CountTo value={monthNights} /></span> room nights in {monthName}</>)}</p>
        )}
      </div>
    </div>
  );
}
