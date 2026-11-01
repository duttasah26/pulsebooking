import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { PushPin } from '@phosphor-icons/react';
import { useSettings } from '../SettingsProvider';
import { useApi } from '../../lib/useApi';
import { usePinned } from '../../lib/pinned';
import { colorFor } from '../../lib/colors';
import { addDays } from '../../lib/dates';

// The bookings pinned to the side: slim vertical tabs under the folded "New Booking" tab, each in its booking's colour with the guest's name
// running down it. Pressing one shows that booking on the calendar and opens it. A pinned booking that has been deleted lets itself go.
function Pin({ id }) {
  const router = useRouter();
  const { settings } = useSettings();
  const { remove } = usePinned();
  const { data, error } = useApi(`/api/bookings/${id}`);
  useEffect(() => {
    if (data?.deleted_at || error?.message === 'Booking not found') remove(id);
  }, [data, error, id, remove]);
  if (!data || data.deleted_at) return null;
  const c = colorFor(data, settings);
  const show = () => router.push({ pathname: '/', query: { view: 'timeline', date: addDays(data.check_in, -3), span: 21, open: data.id } });
  const name = data.name || 'On hold';
  const label = `${name}, room ${data.room_number}. Show on the calendar`;
  return (
    <li className="flex h-44 min-h-24 shrink">
      <button
        type="button"
        onClick={show}
        aria-label={label}
        title={label}
        className="flex h-full w-11 flex-col items-center gap-3 overflow-hidden rounded-lg border py-3 text-[0.9375rem] font-semibold"
        style={{ backgroundColor: c.soft ?? c.bg, borderColor: c.border }}
      >
        <PushPin size={14} weight="fill" aria-hidden="true" className="shrink-0 text-muted" />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap [writing-mode:vertical-rl]">{name}</span>
      </button>
    </li>
  );
}

export default function PinnedBookings({ except }) {
  const { ids: all } = usePinned();
  const ids = all.filter((id) => id !== except); // the open booking already has its own tab
  if (ids.length === 0) return null;
  // display: contents, so each pinned tab is a direct item of the rail: the same size as the main tab, shrinking with it only when they do not fit.
  return (
    <ul role="list" aria-label="Pinned bookings" className="contents">
      {ids.map((id) => <Pin key={id} id={id} />)}
    </ul>
  );
}
