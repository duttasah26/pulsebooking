import { useEffect, useState } from 'react';

const ZONE = 'Asia/Kolkata';
const dateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeParts = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', hour12: true });

const read = () => {
  const now = new Date();
  const part = Object.fromEntries(timeParts.formatToParts(now).map((p) => [p.type, p.value]));
  return { date: dateFormat.format(now), hour: part.hour, minute: part.minute, period: (part.dayPeriod ?? '').toUpperCase() };
};

// The date and time in India (IST), whatever the computer's own clock or zone says, the middle column of the top bar's
// three-column grid: exactly centred while the logo and the tabs fit either side, and pushed along (never under them) when
// the tabs need more room. Plain on purpose: the time in large steady digits with AM or PM beside it, the date under it. No
// seconds and no blinking, so nothing in the header moves while someone is working. It is drawn only once the page is in
// the browser (so the server and the browser never disagree about "now") and re-read every few seconds, redrawing only
// when the minute changes. With little room (a tablet) it is hidden; a phone and a small laptop show the time alone.
export default function IndiaClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow((old) => {
      const next = read();
      return old && old.minute === next.minute && old.hour === next.hour && old.date === next.date ? old : next;
    });
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="pointer-events-none flex items-center justify-center md:max-lg:hidden"
      title="India Standard Time"
      aria-label={now ? `India time: ${now.date}, ${now.hour}:${now.minute} ${now.period}` : 'India time'}
    >
      <div className="flex min-h-10 flex-col items-center justify-center px-2 leading-none whitespace-nowrap text-ink" aria-hidden="true">
        <div className="flex items-baseline gap-1.5 tabular-nums">
          <span className="text-2xl font-semibold tracking-tight">{now ? `${now.hour}:${now.minute}` : '--:--'}</span>
          <span className="text-base font-medium text-ink/70">{now?.period ?? ''}</span>
        </div>
        <span className="mt-1 hidden text-sm text-ink/75 xl:inline">{now?.date ?? ''} IST</span>
      </div>
    </div>
  );
}
