import { Bed, SignIn, SignOut } from '@phosphor-icons/react';

// Arrivals, departures and stays at a glance, as one plain line (nothing to press, so nothing that looks like a button).
// It says what it counts (Today, a day you clicked, a room you clicked, or both), then how many rooms are in use out of all of
// them. Arriving and leaving only appear when there is one, so a quiet day is one short line, not three zeros.
// The icons are the same ones the calendar uses for check-in (green) and check-out (brick).
export default function TodaySummary({ label, arriving, leaving, staying, total }) {
  const part = (Icon, tone, text) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon size={18} aria-hidden="true" className={tone} />
      {text}
    </span>
  );
  return (
    <p className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-[0.9375rem] text-muted md:justify-end">
      <span className="font-semibold text-ink">{label}</span>
      {part(Bed, 'text-muted', total ? <><span className="font-mono text-base font-semibold text-ink">{staying}</span> of {total} rooms in use</> : <><span className="font-mono text-base font-semibold text-ink">{staying}</span> staying</>)}
      {arriving > 0 && part(SignIn, 'text-accent-text', <><span className="font-mono text-base font-semibold text-ink">{arriving}</span> arriving</>)}
      {leaving > 0 && part(SignOut, 'text-danger', <><span className="font-mono text-base font-semibold text-ink">{leaving}</span> leaving</>)}
    </p>
  );
}
