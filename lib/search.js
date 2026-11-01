import sql from './db';

/*
  Name search the way front-desk staff type it. "ZB", "Z B" and "Z" all find "Zee Bangla": the letters are matched against
  the first letter of each word of a name (its initials), as well as against the words themselves.
    - 1 or 2 letters: a word that starts with them, or names whose initials start with them ("z" finds Zubin and Zee Bangla).
    - 3 or more characters: the text anywhere in the name (as before), or initials that start with those letters
      (so "zb" and "zbg" still work, and "ban" finds Bangla).
  textExprs are SQL expressions (name, organization, label...). Returns one SQL condition to AND into a WHERE.
*/
const escapeLike = (text) => text.replace(/[\\%_]/g, (c) => '\\' + c);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORD_START = String.raw`(\w)\w*\W*`; // passed as parameters: backslashes in a template literal would be mangled
const FIRST_LETTER = String.raw`\1`;
const initialsOf = (expr) => sql`lower(regexp_replace(coalesce(${expr}, ''), ${WORD_START}::text, ${FIRST_LETTER}::text, 'g'))`;

export function nameMatch(query, textExprs) {
  const typed = String(query ?? '').trim().slice(0, 60);
  const letters = typed.toLowerCase().replace(/[^a-z0-9]/g, '');
  const substring = `%${escapeLike(typed)}%`;
  const wordStart = `\\m${escapeRegex(typed)}`;
  const asInitials = letters.length >= 1 && letters.length <= 8 ? `${letters}%` : null;
  const short = letters.length <= 2;
  const parts = textExprs.map((expr) => {
    const direct = short ? sql`${expr} ~* ${wordStart}` : sql`${expr} ILIKE ${substring}`;
    return asInitials ? sql`(${direct} OR ${initialsOf(expr)} LIKE ${asInitials})` : direct;
  });
  return parts.reduce((acc, part, i) => (i === 0 ? part : sql`${acc} OR ${part}`));
}

/*
  A month typed into a search box: "nov", "november", "nov 2026" or "nov 26". Returns { month: 1-12, year } (year null when none was typed),
  or null when the text is not a month. A month with no year means that month in any year.
*/
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function parseMonth(query) {
  const m = /^\s*([a-z]{3,9})\.?(?:\s+(\d{4}|\d{2}))?\s*$/i.exec(String(query ?? ''));
  if (!m) return null;
  const word = m[1].toLowerCase();
  const index = MONTHS.findIndex((name) => name.startsWith(word));
  if (index < 0) return null;
  const year = m[2] ? (m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2])) : null;
  return { month: index + 1, year };
}

// SQL: the stay (a daterange expression) has a night in that month. stayExpr is e.g. sql`b.stay`.
export function monthMatch({ month, year }, stayExpr) {
  if (year) {
    const first = `${year}-${String(month).padStart(2, '0')}-01`;
    return sql`${stayExpr} && daterange(${first}::date, (${first}::date + interval '1 month')::date)`;
  }
  return sql`EXISTS (SELECT 1 FROM generate_series(lower(${stayExpr}), upper(${stayExpr}) - 1, interval '1 day') AS d(day) WHERE extract(month FROM d.day) = ${month})`;
}
