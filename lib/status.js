import { today } from './dates';

export const STATUS_LABEL = {
  confirmed: 'Confirmed',
  on_hold: 'On hold',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABEL);

// What the guest is doing, as far as the dates say. The saved status is never touched: staff do not check guests in (the client asked for that),
// so a confirmed booking is shown as Checked in once its check-in day has passed (today is after it, up to and including the check-out day).
export const shownStatus = (b) => (b.status === 'confirmed' && today() > b.check_in && today() <= b.check_out ? 'checked_in' : b.status);
// Has the guest arrived: checked in or out by status, or a confirmed booking whose check-in day has passed.
export const hasArrived = (b) => b.status === 'checked_in' || b.status === 'checked_out' || (b.status === 'confirmed' && today() > b.check_in);
