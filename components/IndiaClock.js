import { useEffect, useState } from 'react';

const ZONE = 'Asia/Kolkata';
const dateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeParts = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', hour12: true });

const read = () => {
  const now = new Date();
  const part = Object.fromEntries(timeParts.formatToParts(now).map((p) => [p.type, p.value]));
  return { date: dateFormat.format(now), hour: part.hour, minute: part.minute, period: (part.dayPeriod ?? '').toUpperCase() };
};

// The date and time in India (IST), whatever the computer's own clock or zone says, at the right of the top bar, beside
// Settings. Plain on purpose: the time in steady figures with AM or PM beside it, the date before it on wide screens. No
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
      className="pointer-events-none flex items-center md:max-lg:hidden"
      title="India Standard Time"
      aria-label={now ? `India time: ${now.date}, ${now.hour}:${now.minute} ${now.period}` : 'India time'}
    >
      <div className="flex items-baseline gap-2 whitespace-nowrap leading-none text-ink" aria-hidden="true">
        <span className="hidden text-[0.9375rem] text-muted xl:inline">{now?.date ?? ''}</span>
        <span className="font-mono text-lg font-semibold">{now ? `${now.hour}:${now.minute}` : '--:--'}</span>
        <span className="text-sm font-semibold text-muted">{now?.period ?? ''}</span>
      </div>
    </div>
  );
}
