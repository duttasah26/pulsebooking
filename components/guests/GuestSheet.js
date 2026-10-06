import { useState } from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';
import Sheet from '../Sheet';
import GuestForm from './GuestForm';
import MergeSheet from './MergeSheet';
import PickGuestSheet from './PickGuestSheet';
import { useToast } from '../Toast';
import { useApi } from '../../lib/useApi';

// What the guest form looks like while the guest is still loading: the same blocks in the same places (name, phone and
// email, organization, colour, notes, then the list of stays), so nothing jumps when the details arrive.
function GuestSkeleton() {
  const bar = (w, h = 'h-11') => <div className={`skeleton ${h} ${w} rounded-lg`} />;
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the guest">
      <div className="space-y-2">{bar('w-16', 'h-4')}{bar('w-full')}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">{bar('w-28', 'h-4')}{bar('w-full')}</div>
        <div className="space-y-2">{bar('w-28', 'h-4')}{bar('w-full')}</div>
      </div>
      <div className="space-y-2">{bar('w-36', 'h-4')}{bar('w-full')}</div>
      <div className="space-y-2">{bar('w-40', 'h-4')}<div className="flex gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton size-11 rounded-lg" style={{ animationDelay: `${i * 80}ms` }} />)}</div></div>
      <div className="space-y-2">{bar('w-16', 'h-4')}{bar('w-full', 'h-20')}</div>
      <div className="space-y-2 border-t border-line pt-4">
        {bar('w-24', 'h-5')}
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 w-full rounded-lg" style={{ animationDelay: `${i * 90}ms` }} />)}
      </div>
    </div>
  );
}

// Loads a guest (id) or starts a new one (id === 'new') and shows the form in a sheet. From an existing guest, "Merge with
// another guest" picks the other one and opens the merge screen (nothing changes until it is confirmed there).
export default function GuestSheet({ id, onClose, onChanged }) {
  const toast = useToast();
  const isNew = id === 'new';
  const detail = useApi(isNew ? null : `/api/guests/${id}`);
  const rooms = useApi('/api/rooms');
  const guest = detail.data;
  const [merge, setMerge] = useState(null); // null | 'pick' | { other }

  if (!isNew && !guest) {
    return (
      <Sheet title="Guest" onClose={onClose}>
        {detail.error ? (
          <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-base text-danger">
            Could not load this guest: {detail.error.message}
            <button type="button" className="btn ml-3" onClick={detail.reload}><ArrowClockwise size={16} aria-hidden="true" /> Try again</button>
          </p>
        ) : (
          <GuestSkeleton />
        )}
      </Sheet>
    );
  }
  return (
    <>
      <GuestForm
        key={id}
        isNew={isNew}
        guest={guest}
        rooms={rooms.data ?? []}
        onClose={onClose}
        onChanged={() => { onChanged(); detail.reload(); }}
        toast={toast}
        onMerge={isNew ? undefined : () => setMerge('pick')}
      />
      {merge === 'pick' && <PickGuestSheet id={id} onClose={() => setMerge(null)} onPick={(other) => setMerge({ other })} />}
      {merge && merge !== 'pick' && (
        <MergeSheet
          a={Number(id)}
          b={merge.other}
          onClose={() => setMerge(null)}
          onDone={() => { setMerge(null); onChanged(); onClose(); }}
        />
      )}
    </>
  );
}
