// Dates are YYYY-MM-DD strings in local time. No time zones, no Date objects crossing the API.
const pad = (n) => String(n).padStart(2, '0');

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parse(s));
// Today in India (the property is there), whatever time zone the device is set to: the same day as the clock in the top bar.
const indiaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
export const today = () => indiaDay.format(new Date());

export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const range = (start, n) => Array.from({ length: n }, (_, i) => addDays(start, i));

export const monthStart = (s) => `${s.slice(0, 7)}-01`;
export const addMonths = (s, n) => {
  const d = parse(monthStart(s));
  d.setMonth(d.getMonth() + n);
  return ymd(d);
};
export const daysInMonth = (s) => {
  const d = parse(s);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};

// Monday = 0 ... Sunday = 6
export const weekdayIndex = (s) => (parse(s).getDay() + 6) % 7;
export const isWeekend = (s) => weekdayIndex(s) >= 5;
export const dayOfMonth = (s) => Number(s.slice(8, 10));

const fmt = (opts) => {
  const f = new Intl.DateTimeFormat('en-GB', opts);
  return (s) => f.format(parse(s));
};
export const fmtWeekday = fmt({ weekday: 'short' });
export const fmtMonthShort = fmt({ month: 'short' });
export const fmtShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
export const fmtLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
export const fmtMonth = fmt({ month: 'long', year: 'numeric' });
export const fmtDayMonth = fmt({ day: 'numeric', month: 'short' });
export const fmtDayMonthYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' });

export const fmtDateTime = (iso) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const nightsLabel = (n) => `${n} night${n === 1 ? '' : 's'}`;
