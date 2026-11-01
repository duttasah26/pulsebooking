import { Bed, Moon, SignIn, SignOut } from '@phosphor-icons/react';
import CountTo from '../CountTo';

// Arrivals, departures and stays at a glance, as one plain line (nothing to press, so nothing that looks like a button).
// It says what it counts (Today, a day you clicked, a room you clicked, or both), then how many rooms are in use out of all of
// them, with the room nights sold so far this month under it. One small tile: the label on the left, the lines beside it. Arriving and leaving only appear when there is one, so a quiet day is one short line, not three zeros.
// The icons are the same ones the calendar uses for check-in (green) and check-out (brick).
export default function TodaySummary({ label, arriving, leaving, staying, total, monthNights, monthName, loading = false }) {
  // Not loaded yet: the tile's own outline, so the header keeps its shape and shows no number that is not true.
  if (loading) return <div aria-hidden="true" className="skeleton min-h-[4.25rem] w-80 rounded-lg" />;
  const part = (Icon, tone, text) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon size={18} aria-hidden="true" className={tone} />
      {text}
    </span>
  );
  return (
    <div className="inline-flex items-center gap-4 rounded-lg bg-surface-2 px-4 py-2 text-[0.9375rem] text-muted">
      {/* The label: "Today", or the day you clicked, with the room on the next line ("Tue 10 Nov" over "Room 201"), in a cell with a minimum
          width, so the tile keeps about the same size whatever is chosen. */}
      <span className="flex min-w-24 shrink-0 flex-col items-start justify-center self-stretch whitespace-nowrap border-r border-line pr-4 font-semibold text-ink">
        {label.split(', ')[0]}
        {label.includes(', ') && <span className="text-[0.8125rem] font-medium text-muted">{label.split(', ').slice(1).join(', ')}</span>}
      </span>
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
