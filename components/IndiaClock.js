import { useEffect, useState } from 'react';

const ZONE = 'Asia/Kolkata';
const dateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeParts = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

const read = () => {
  const now = new Date();
  const part = Object.fromEntries(timeParts.formatToParts(now).map((p) => [p.type, p.value]));
  return { date: dateFormat.format(now), hour: part.hour, minute: part.minute, second: part.second, period: (part.dayPeriod ?? '').toUpperCase() };
};

// The date and time in India (IST), whatever the computer's own clock or zone says, the middle column of the top bar's three-column grid:
// exactly centred while the logo and the tabs fit either side, and pushed along (never under them) when the tabs need more
// room. It looks like a digital clock: big fixed-width digits with a blinking colon, small seconds, AM or PM in green, and the
// date under it. It is drawn only once the page is in the browser (so the server and the browser never disagree about "now"),
// and it ticks every second. With little room (a tablet) it is hidden; a phone and a small laptop show the time alone.
export default function IndiaClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(read());
    const timer = setInterval(() => setNow(read()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="pointer-events-none flex items-center justify-center md:max-lg:hidden"
      title="India Standard Time"
      aria-label={now ? `India time: ${now.date}, ${now.hour}:${now.minute} ${now.period}` : 'India time'}
    >
      <div className="flex min-h-10 flex-col items-center justify-center px-2 leading-none whitespace-nowrap" aria-hidden="true">
        <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
          <span className="text-xl font-bold tracking-tight">
            {now?.hour ?? '--'}
            <span className="clock-colon mx-px">:</span>
            {now?.minute ?? '--'}
          </span>
          <span className="w-[1.6ch] text-xs font-semibold text-muted">{now?.second ?? '--'}</span>
          <span className="rounded bg-accent-soft px-1 text-xs font-bold text-accent-text">{now?.period ?? ''}</span>
        </div>
        <span className="mt-0.5 hidden text-xs font-medium text-ink/80 xl:inline">{now?.date ?? ''}<span className="text-muted"> IST</span></span>
      </div>
    </div>
  );
}
