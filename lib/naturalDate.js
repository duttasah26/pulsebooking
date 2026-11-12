import { addDays as addDaysStr, parse, today, ymd } from './dates';

// Reads a small English grammar for days: today · tomorrow · yesterday · next/this <weekday> · <weekday> · next week/month/year ·
// this/next weekend · in N days/weeks/months/years · <month> <day>[ <year>] · <day> <month> · YYYY-MM-DD · MM/DD[/YYYY] · the 21st,
// in any combination, with or without a time of day ("next fri 3pm", "dec 1 at 9:30"; the time is read and left out, as the app
// books whole days). Weekday, month and unit names may be shortened to an unambiguous prefix. A day is returned as YYYY-MM-DD.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const UNITS = ['days', 'weeks', 'months', 'years', 'hours', 'minutes'];
const PERIODS = ['week', 'month', 'year', 'weekend'];
const RELATIVE_DAYS = ['today', 'tomorrow', 'yesterday', 'tmrw', 'tmr'];
const RELATIVE_OFFSETS = [0, 1, -1, 1, 1];
const WORD_TIMES = ['noon', 'midday', 'midnight', 'morning', 'afternoon', 'evening', 'night', 'tonight', 'eod'];
const UNIT_ALIASES = { d: 'days', wk: 'weeks', wks: 'weeks', mo: 'months', mos: 'months', yr: 'years', yrs: 'years', h: 'hours', hr: 'hours', hrs: 'hours', m: 'minutes', min: 'minutes', mins: 'minutes' };
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const FILLER = new Set(['at', 'on', 'the', 'of', '@', 'from', 'now', "o'clock", 'oclock']);
const KEYWORDS = [...FILLER, 'next', 'this', 'in', 'day', 'after', 'weekend', 'now', ...WEEKDAYS, ...MONTHS, ...UNITS, ...WORD_TIMES, ...RELATIVE_DAYS];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

function addMonths(d, n) {
  const anchor = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return new Date(anchor.getFullYear(), anchor.getMonth(), Math.min(d.getDate(), daysInMonth(anchor.getFullYear(), anchor.getMonth())));
}

// Exact match first, then the single word the token is a prefix of (once the token is `min` letters long).
function matchWord(token, words, min) {
  const exact = words.indexOf(token);
  if (exact >= 0) return exact;
  if (token.length < min) return -1;
  let found = -1;
  for (let i = 0; i < words.length; i += 1) {
    if (words[i].startsWith(token)) {
      if (found >= 0) return -1;
      found = i;
    }
  }
  return found;
}

function matchPeriod(token) {
  const hits = PERIODS.filter((p) => p === token || p.startsWith(token));
  return hits.length ? hits.reduce((a, b) => (b.length < a.length ? b : a)) : null;
}

function matchUnit(token) {
  if (UNIT_ALIASES[token]) return UNIT_ALIASES[token];
  const i = matchWord(token, UNITS, 1);
  return i >= 0 ? UNITS[i] : null;
}

const parseCount = (token) => (/^\d{1,3}$/.test(token) ? Number(token) : NUMBER_WORDS[token] ?? null);

function validClock(hourText, minuteText, meridiem) {
  const hours = Number(hourText);
  const minutes = minuteText === undefined ? 0 : Number(minuteText);
  if (!Number.isInteger(hours) || minutes < 0 || minutes > 59) return false;
  return meridiem ? hours >= 1 && hours <= 12 : hours <= 23;
}

// Finds and removes the time of day ("3pm", "15:00", "noon", "tonight"). Returns null for a malformed time.
function scanTime(tokens) {
  let clock = false;
  let tonight = false;
  const rest = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const next = tokens[i + 1];
    const attached = /^(\d{1,2})(?::(\d{2}))?(am|pm|a|p)$/.exec(token);
    if (attached) {
      if (!validClock(attached[1], attached[2], attached[3]) || clock) return null;
      clock = true;
      continue;
    }
    const numeric = /^(\d{1,2})(?::(\d{2}))?$/.exec(token);
    if (numeric && next !== undefined && /^(am|pm)$/.test(next)) {
      if (!validClock(numeric[1], numeric[2], next) || clock) return null;
      clock = true;
      i += 1;
      continue;
    }
    if (numeric && numeric[2] !== undefined) {
      if (!validClock(numeric[1], numeric[2], undefined) || clock) return null;
      clock = true;
      continue;
    }
    if (/^\d{1,2}:\d?$/.test(token)) {
      if (clock) return null;
      clock = true;
      continue;
    }
    if (token === 'end' && next === 'of' && tokens[i + 2] === 'day') {
      clock = true;
      i += 2;
      continue;
    }
    if (token === 'after' && tokens[i - 1] === 'day') {
      rest.push(token);
      continue;
    }
    const w = matchWord(token, WORD_TIMES, 3);
    if (w >= 0) {
      clock = true;
      if (WORD_TIMES[w] === 'tonight') tonight = true;
      continue;
    }
    rest.push(token);
  }
  return { rest, tonight, clock };
}

// A one- or two-letter start of a known word ("dec 1 a|t") is still being typed, not a mistake.
const unfinished = (token) => token.length <= 2 && /^[a-z]+$/.test(token) && KEYWORDS.some((k) => k.startsWith(token));

// Month + day without a year: this year, unless the day is more than a week in the past, then next year.
function monthDay(month, day, now) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const grace = addDays(now, -7).getTime();
  for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
    if (day > daysInMonth(year, month)) continue;
    const candidate = new Date(year, month, day);
    if (candidate.getTime() >= grace) return candidate;
  }
  return null;
}

function numericDate(token, now) {
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(token);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])];
    return m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m) ? null : new Date(y, m, d);
  }
  const full = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(token);
  if (full) {
    const [m, d, y] = [Number(full[1]) - 1, Number(full[2]), Number(full[3])];
    return m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m) ? null : new Date(y, m, d);
  }
  const short = /^(\d{1,2})\/(\d{1,2})$/.exec(token);
  return short ? monthDay(Number(short[1]) - 1, Number(short[2]), now) : null;
}

function monthDayForm(tokens, now) {
  let month = -1;
  const numbers = [];
  for (const token of tokens) {
    if (/^\d/.test(token)) {
      numbers.push(token);
      continue;
    }
    const mi = matchWord(token, MONTHS, 3);
    if (mi >= 0 && month < 0) {
      month = mi;
      continue;
    }
    if (matchWord(token, WEEKDAYS, 2) >= 0) continue;
    return null;
  }
  if (month < 0 || numbers.length === 0 || numbers.length > 2) return null;
  let day = -1;
  let year = -1;
  for (const token of numbers) {
    const dm = /^(\d{1,2})(?:st|nd|rd|th)?$/.exec(token);
    if (dm && day < 0) day = Number(dm[1]);
    else if (/^\d{4}$/.test(token) && year < 0) year = Number(token);
    else return null;
  }
  if (day < 1) return null;
  if (year < 0) return monthDay(month, day, now);
  return day > daysInMonth(year, month) ? null : new Date(year, month, day);
}

function resolveDay(tokens, now) {
  const first = tokens[0];
  if (first === undefined) return null;
  if (tokens.length === 1) {
    const rel = matchWord(first, RELATIVE_DAYS, 3);
    if (rel >= 0) return addDays(now, RELATIVE_OFFSETS[rel]);
    const wd = matchWord(first, WEEKDAYS, 2);
    if (wd >= 0) return addDays(now, (wd - now.getDay() + 7) % 7);
    if (first === 'weekend') return addDays(now, (6 - now.getDay() + 7) % 7);
    const numeric = numericDate(first, now);
    if (numeric) return numeric;
    const ord = /^(\d{1,2})(?:st|nd|rd|th)$/.exec(first);
    if (ord) {
      const day = Number(ord[1]);
      const thisMonth = day <= daysInMonth(now.getFullYear(), now.getMonth()) ? new Date(now.getFullYear(), now.getMonth(), day) : null;
      if (thisMonth && thisMonth.getTime() >= now.getTime()) return thisMonth;
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return day > daysInMonth(next.getFullYear(), next.getMonth()) ? null : new Date(next.getFullYear(), next.getMonth(), day);
    }
    return null;
  }
  if (tokens.length === 3 && first === 'day' && tokens[1] === 'after' && matchWord(tokens[2], ['tomorrow'], 3) === 0) return addDays(now, 2);
  if (tokens.length === 2 && (first === 'next' || first === 'this')) {
    const target = tokens[1];
    const wd = matchWord(target, WEEKDAYS, 1);
    if (wd >= 0) {
      const ahead = (wd - now.getDay() + 7) % 7;
      return addDays(now, first === 'next' && ahead === 0 ? 7 : ahead);
    }
    const period = matchPeriod(target);
    if (period === 'weekend') {
      const saturday = addDays(now, (6 - now.getDay() + 7) % 7);
      return first === 'next' ? addDays(saturday, 7) : saturday;
    }
    if (first !== 'next' || period === null) return null;
    if (period === 'week') return addDays(now, 7);
    if (period === 'month') return addMonths(now, 1);
    return addMonths(now, 12);
  }
  const offset = first === 'in' ? 1 : 0;
  if (tokens.length === offset + 2) {
    const count = parseCount(tokens[offset]);
    const unit = matchUnit(tokens[offset + 1]);
    if (count !== null && unit !== null) {
      if (unit === 'days') return addDays(now, count);
      if (unit === 'weeks') return addDays(now, count * 7);
      if (unit === 'months') return addMonths(now, count);
      if (unit === 'years') return addMonths(now, count * 12);
      return null;
    }
  }
  return monthDayForm(tokens, now);
}

// One day from free text, as YYYY-MM-DD, or null when nothing is recognised. `base` is "today" as YYYY-MM-DD (the property's day).
export function parseDay(text, base = today()) {
  const normalized = String(text).toLowerCase().replace(/(\d{4}-\d{2}-\d{2})t(\d)/g, '$1 $2').replace(/[,·]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const now = startOfDay(parse(base));
  if (normalized === 'now') return base;
  const scanned = scanTime(normalized.split(' ').filter((t) => !FILLER.has(t)));
  if (!scanned) return null;
  const { rest, tonight, clock } = scanned;
  const offset = rest[0] === 'in' ? 1 : 0;
  if (rest.length === offset + 2) {
    const count = parseCount(rest[offset]);
    const unit = matchUnit(rest[offset + 1]);
    if (count !== null && (unit === 'hours' || unit === 'minutes')) return clock ? null : base;
  }
  const tokens = tonight && rest.length === 0 ? ['today'] : rest;
  let day = resolveDay(tokens, now);
  if (!day && tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    const head = tokens.slice(0, -1);
    if (!clock && /^\d{1,2}$/.test(last) && Number(last) <= 23) day = resolveDay(head, now);
    else if (unfinished(last)) day = resolveDay(head, now);
  }
  if (!day) return tokens.length === 0 && clock ? base : null;
  return ymd(day);
}

// A stay or a span from free text: "fri to sun", "dec 1 - dec 5", "next fri for 3 nights", or a single day. Returns { from, to }
// as YYYY-MM-DD (`to` is the last day, the same as `from` for one day), or null.
export function parseSpan(text, base = today()) {
  const raw = String(text).trim();
  if (!raw) return null;
  const nights = /^(.*?)\s+for\s+(\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:night|day)s?$/i.exec(raw);
  if (nights) {
    const from = parseDay(nights[1], base);
    const n = parseCount(nights[2].toLowerCase());
    return from && n ? { from, to: addDaysStr(from, n) } : null;
  }
  const parts = raw.split(/\s+(?:to|until|till|through|thru)\s+|\s+[-–]\s+/i);
  if (parts.length === 2) {
    const from = parseDay(parts[0], base);
    let to = parseDay(parts[1], base);
    if (from && to && to < from && !/\d{4}/.test(parts[1])) to = parseDay(parts[1], from) ?? to;
    if (from && to && to >= from) return { from, to };
    return null;
  }
  const one = parseDay(raw, base);
  return one ? { from: one, to: one } : null;
}
