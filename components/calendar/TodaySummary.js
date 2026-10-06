import { Bed, SignIn, SignOut } from '@phosphor-icons/react';

// Arrivals, departures and stays at a glance, as booking systems such as Mews and Cloudbeds show on their front-desk screens.
// It says what it counts (Today, a day you clicked, a room you clicked, or both) and shows three tiles, each an icon, a big
// number and a word; nothing to press. The icons are the same ones the calendar uses for check-in and check-out.
export default function TodaySummary({ label, arriving, leaving, staying }) {
  const tile = (Icon, n, word, tone) => (
    <li className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1">
      <Icon size={18} aria-hidden="true" className={tone} />
      <span className="font-mono text-lg font-semibold leading-none text-ink">{n}</span>
      <span className="text-sm text-ink/80">{word}</span>
    </li>
  );
  return (
    <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 md:justify-end">
      <p className="text-sm font-medium text-ink/80">{label}</p>
      <ul aria-label={label} className="flex items-center gap-1.5">
        {tile(SignIn, arriving, 'arriving', 'text-accent-text')}
        {tile(SignOut, leaving, 'leaving', 'text-danger')}
        {tile(Bed, staying, 'staying', 'text-ink/70')}
      </ul>
    </div>
  );
}
