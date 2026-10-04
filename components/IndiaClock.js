import { useEffect, useState } from 'react';
import { Clock } from '@phosphor-icons/react';

const ZONE = 'Asia/Kolkata';
const dateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', hour12: true });

const read = () => {
  const now = new Date();
  return { date: dateFormat.format(now), time: timeFormat.format(now).toUpperCase() };
};

// The date and time in India (IST), whatever the computer's own clock or zone says, the middle column of the top bar's three-column grid: exactly centred while the logo and the tabs fit either side, and pushed along (never under them) when the tabs need more room. It is
// drawn only once the page is in the browser (so the server and the browser never disagree about "now"), and it changes
// at the start of each minute. With little room (a tablet) it is hidden; on a phone and a small laptop it shows the time alone.
export default function IndiaClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(read());
    const timer = setInterval(() => {
      const next = read();
      setNow((prev) => (prev && prev.date === next.date && prev.time === next.time ? prev : next));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="pointer-events-none flex items-center justify-center gap-2 whitespace-nowrap px-3 text-sm md:max-lg:hidden"
      title="India Standard Time"
      aria-label={now ? `India time: ${now.date}, ${now.time}` : 'India time'}
    >
      <Clock size={16} aria-hidden="true" className="shrink-0 text-muted" />
      <span className="hidden font-medium xl:inline">{now?.date ?? ''}</span>
      <span className="font-mono font-semibold">{now?.time ?? ''}</span>
      <span className="text-xs font-medium text-muted">IST</span>
    </div>
  );
}
