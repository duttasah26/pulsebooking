import { Bed, SignIn, SignOut } from '@phosphor-icons/react';

// Arrivals, departures and stays at a glance, as booking systems such as Mews and Cloudbeds show on their front-desk screens.
// One bordered strip: what it counts (Today, a day you clicked, a room you clicked, or both), then three counts divided by
// hairlines, each a symbol, a figure and a word. A count of zero is quiet (muted) so the numbers that matter stand out;
// nothing to press. The icons are the same ones the calendar uses for check-in and check-out.
export default function TodaySummary({ label, arriving, leaving, staying }) {
  const cell = (Icon, n, word, tone) => (
    <li className="flex items-center gap-2 whitespace-nowrap px-3">
      <Icon size={18} aria-hidden="true" className={n ? tone : 'text-muted'} />
      <span className={`font-mono text-base font-semibold tabular-nums ${n ? 'text-ink' : 'text-muted'}`}>{n}</span>
      <span className="text-[0.9375rem] text-muted">{word}</span>
    </li>
  );
  return (
    <div className="inline-flex min-h-10 items-stretch divide-x divide-line overflow-hidden rounded-lg border border-line bg-surface lg:min-h-9">
      <p className="flex items-center bg-surface-2 px-3 text-[0.9375rem] font-semibold text-ink">{label}</p>
      <ul aria-label={label} className="flex items-stretch divide-x divide-line">
        {cell(SignIn, arriving, 'arriving', 'text-accent-text')}
        {cell(SignOut, leaving, 'leaving', 'text-danger')}
        {cell(Bed, staying, 'staying', 'text-ink')}
      </ul>
    </div>
  );
}
