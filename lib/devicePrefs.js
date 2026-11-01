import { useStoredState } from './useStoredState';

// Choices kept on this device (in the browser), not shared with other staff. Each has a hook that returns [value, set], and the
// Settings page and the screens that use the choice read the same keys, so a change shows at once.

// How tall the calendar's rows are: 'standard' fits every room in the window; 'roomy' keeps rows at least 40px with larger names.
export const useRowSize = () => useStoredState('pulse.rowSize', 'standard', { parse: (raw) => (raw === 'roomy' || raw === 'standard' ? raw : undefined) });

// Which view the calendar opens on when the address does not name one.
export const useFirstView = () => useStoredState('pulse.firstView', 'timeline', { parse: (raw) => (raw === 'timeline' || raw === 'month' ? raw : undefined) });

// Whether stays that have already checked out are drawn on the calendar.
export const useShowDone = () => useStoredState('pulse.showCheckedOut', true, { parse: (raw) => raw !== '0', serialize: (v) => (v ? '1' : '0') });

// Which parts of the Overview page are shown.
export const OVERVIEW_PARTS = [
  ['cards', 'The four figures and their list'],
  ['week', 'Week overview'],
];
const OVERVIEW_ALL = { cards: true, week: true };
export const useOverviewParts = () =>
  useStoredState('pulse.overview', OVERVIEW_ALL, {
    parse: (raw) => {
      try {
        return { ...OVERVIEW_ALL, ...JSON.parse(raw) };
      } catch {
        return undefined;
      }
    },
    serialize: JSON.stringify,
  });
