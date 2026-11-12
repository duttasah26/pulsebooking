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
  ['cards', 'The figures and their list'],
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

// What each figure on the Overview counts: bookings, the guests in them (adults and children), or the rooms they hold. The week chart has
// its own choice. Kept on this device, so the page opens the way it was left.
export const MEASURES = [
  ['guests', 'Number of guests'],
  ['bookings', 'Bookings'],
  ['rooms', 'Rooms'],
];
const OVERVIEW_MEASURES = { arrivals: 'guests', departures: 'guests', house: 'rooms', upcoming: 'bookings', holds: 'bookings', week: 'guests' };
export const useOverviewMeasures = () =>
  useStoredState('pulse.overviewMeasures', OVERVIEW_MEASURES, {
    parse: (raw) => {
      try {
        const saved = JSON.parse(raw);
        const ok = Object.fromEntries(Object.entries(saved).filter(([k, v]) => k in OVERVIEW_MEASURES && MEASURES.some(([m]) => m === v)));
        return { ...OVERVIEW_MEASURES, ...ok };
      } catch {
        return undefined;
      }
    },
    serialize: JSON.stringify,
  });
