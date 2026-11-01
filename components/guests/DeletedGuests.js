import { useApi, api } from '../../lib/useApi';
import { fmtDateTime } from '../../lib/dates';
import { useToast } from '../Toast';

// The Deleted tab: guests that were deleted, newest first, each with a Restore button. Restoring puts them back in the guest list
// with all their old stays; nothing was removed when they were deleted. onRestored lets the page refresh its own list.
export default function DeletedGuests({ onRestored }) {
  const toast = useToast();
  const list = useApi('/api/guests?deleted=1&sort=name');
  const guests = (list.data ?? []).slice().sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));

  const restore = async (g) => {
    try {
      await api(`/api/guests/${g.id}/restore`, { method: 'POST' });
      toast({ message: `${g.name} restored`, duration: 3000 });
      list.reload();
      onRestored?.();
    } catch (err) {
      toast({ message: `Could not restore: ${err.message}` });
    }
  };

  if (list.error) {
    return (
      <p role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft px-4 py-3 text-base text-danger">
        Could not load deleted guests: {list.error.message}.
        <button type="button" className="btn btn-sm" onClick={list.reload}>Retry</button>
      </p>
    );
  }
  if (!list.data) return <div className="skeleton h-16 rounded-lg" aria-busy="true" aria-label="Loading deleted guests…" />;
  if (!guests.length) return <p className="rounded-lg border border-line bg-surface px-6 py-12 text-center text-base text-muted">No deleted guests.</p>;
  return (
    <ul className="animate-settle divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {guests.map((g) => (
        <li key={g.id} className="flex items-center gap-4 px-4 py-3 md:px-5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0625rem] font-semibold">{g.name}</span>
            <span className="block text-[0.9375rem] text-muted">
              Deleted {fmtDateTime(g.deleted_at)}{g.deleted_by ? ` by ${g.deleted_by}` : ''}
            </span>
          </span>
          <button type="button" className="btn btn-sm" onClick={() => restore(g)}>Restore</button>
        </li>
      ))}
    </ul>
  );
}
