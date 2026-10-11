import { Bed, SignIn, SignOut } from '@phosphor-icons/react';

// Arrivals, departures and stays at a glance, as booking systems such as Mews and Cloudbeds show on their front-desk screens.
// It says what it counts (Today, a day you clicked, a room you clicked, or both) and reads as one line of three counts, each
// a symbol, a figure and a word; no boxes, nothing to press. The icons are the same ones the calendar uses for check-in and check-out.
export default function TodaySummary({ label, arriving, leaving, staying }) {
  const tile = (Icon, n, word, tone) => (
    <li className="flex items-center gap-1.5 whitespace-nowrap">
      <Icon size={18} aria-hidden="true" className={tone} />
      <span className="font-mono text-base font-semibold text-ink">{n}</span>
      <span className="text-[0.9375rem] text-muted">{word}</span>
    </li>
  );
  return (
    <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1 md:justify-end">
      <p className="text-[0.9375rem] font-semibold text-ink">{label}</p>
      <ul aria-label={label} className="flex items-center gap-4">
        {tile(SignIn, arriving, 'arriving', 'text-accent-text')}
        {tile(SignOut, leaving, 'leaving', 'text-danger')}
        {tile(Bed, staying, 'staying', 'text-muted')}
      </ul>
    </div>
  );
}
