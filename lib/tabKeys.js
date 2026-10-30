// Arrow keys on a list of tabs (the WAI-ARIA tabs pattern): Left and Right (or Up and Down) move to the next tab and choose it, Home and
// End go to the first and last. Use as onKeyDown on the element that has role="tablist", and give each tab tabIndex 0 when chosen and -1
// otherwise, so Tab moves past the list in one step.
export function tabKeys(e) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]')].filter((t) => !t.disabled);
  const at = tabs.indexOf(document.activeElement);
  if (at < 0) return;
  let to;
  if (e.key in step) to = (at + step[e.key] + tabs.length) % tabs.length;
  else if (e.key === 'Home') to = 0;
  else if (e.key === 'End') to = tabs.length - 1;
  else return;
  e.preventDefault();
  tabs[to].focus();
  tabs[to].click();
}
