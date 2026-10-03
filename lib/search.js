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
