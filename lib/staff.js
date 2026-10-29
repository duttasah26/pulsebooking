// A staff login can be an email address (pulse.newtown@gmail.com). Wherever a person is named on screen, only the part before
// the @ is shown ("pulse.newtown"). The stored value stays whole. The assistant's edits are stored as "<name> (assistant)".
export function displayName(who) {
  const text = String(who ?? '').trim();
  if (!text) return '';
  return text.replace(/@[^\s()]+/g, '');
}
