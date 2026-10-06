import { useState } from 'react';
import { ArrowRight, Buildings, Envelope, Note, Phone, UserCircle, GitMerge, X } from '@phosphor-icons/react';
import Sheet from '../Sheet';
import HoldButton from '../HoldButton';
import { useToast } from '../Toast';
import { api, useApi } from '../../lib/useApi';
import { fmtDayMonthYear } from '../../lib/dates';

/*
  Merging two guests into one, only when the person at the desk asks for it and holds the button.
  The screen shows both guests side by side, asks which one to KEEP (its name stays), and says in plain words what will
  happen before anything does: every stay moves to the kept guest, empty details are filled in from the other, the notes
  of both are kept, and the other guest record is removed. The old details are written into the kept guest's notes.
    a, b: guest ids   onDone(): called after a merge
*/
const stayCount = (guest) => (guest.bookings ?? []).filter((b) => !b.deleted_at).length;
const lastStay = (guest) => (guest.bookings ?? []).filter((b) => !b.deleted_at).map((b) => b.check_in).sort().pop();

function Card({ guest, keep, onKeep }) {
  return (
    <label className={`block cursor-pointer rounded-lg border-2 p-3 transition-colors duration-150 ${keep ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-surface-2'}`}>
      <span className="flex items-center gap-2">
        <input type="radio" name="keep" className="size-5 accent-[var(--accent)]" checked={keep} onChange={onKeep} />
        <span className="font-semibold">{keep ? 'Keep this guest' : 'Merge into the other'}</span>
      </span>
      <span className="mt-2 flex items-center gap-2 text-lg font-semibold"><UserCircle size={24} aria-hidden="true" className="shrink-0 text-muted" /><span className="min-w-0 break-words">{guest.name}</span></span>
      <dl className="mt-1 space-y-0.5 text-base text-ink/80">
        <div className="flex items-center gap-2"><Phone size={16} aria-hidden="true" className="shrink-0 text-muted" /><dt className="sr-only">Phone</dt><dd>{guest.phone || <span className="text-muted">No phone</span>}</dd></div>
        <div className="flex items-center gap-2"><Envelope size={16} aria-hidden="true" className="shrink-0 text-muted" /><dt className="sr-only">Email</dt><dd className="min-w-0 break-words">{guest.email || <span className="text-muted">No email</span>}</dd></div>
        <div className="flex items-center gap-2"><Buildings size={16} aria-hidden="true" className="shrink-0 text-muted" /><dt className="sr-only">Organization</dt><dd>{guest.organization || <span className="text-muted">No organization</span>}</dd></div>
      </dl>
      <p className="mt-2 font-mono text-sm font-semibold">
        {stayCount(guest)} {stayCount(guest) === 1 ? 'stay' : 'stays'}
        {lastStay(guest) && <span className="font-sans font-normal text-muted">, last {fmtDayMonthYear(lastStay(guest))}</span>}
      </p>
    </label>
  );
}

export default function MergeSheet({ a, b, onClose, onDone }) {
  const toast = useToast();
  const first = useApi(`/api/guests/${a}`);
  const second = useApi(`/api/guests/${b}`);
  const [keepId, setKeepId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ga = first.data;
  const gb = second.data;

  if (!ga || !gb) {
    return (
      <Sheet title="Merge guests" onClose={onClose} wide>
        <p className="text-muted">{first.error?.message || second.error?.message || 'Loading both guests…'}</p>
      </Sheet>
    );
  }
  // Suggest keeping the guest with more stays (then more details, then the older record), but the choice is theirs.
  const detail = (g) => [g.phone, g.email, g.organization].filter(Boolean).length;
  const suggested = [ga, gb].sort((x, y) => stayCount(y) - stayCount(x) || detail(y) - detail(x) || x.id - y.id)[0].id;
  const keepGuest = [ga, gb].find((g) => g.id === (keepId ?? suggested));
  const other = keepGuest.id === ga.id ? gb : ga;
  const filled = ['phone', 'email', 'organization'].filter((k) => !keepGuest[k] && other[k]);
  const label = { phone: 'phone', email: 'email', organization: 'organization' };

  const merge = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api('/api/guests/merge', { method: 'POST', body: { keep_id: keepGuest.id, merge_id: other.id } });
      toast({ message: `Merged “${result.from}” into “${keepGuest.name}”. ${result.moved} ${result.moved === 1 ? 'stay' : 'stays'} moved.`, duration: 5000 });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Merge guests"
      onClose={onClose}
      wide
      footer={
        <div className="space-y-2">
          <HoldButton onConfirm={merge} disabled={busy} title="Press and hold to merge" className="btn btn-primary w-full">
            {busy ? 'Merging…' : <><GitMerge size={18} aria-hidden="true" /> {`Hold to Merge into “${keepGuest.name}”`}</>}
          </HoldButton>
          <button type="button" className="btn w-full" onClick={onClose} disabled={busy}><X size={18} aria-hidden="true" /> Cancel, change nothing</button>
        </div>
      }
    >
      <div className="space-y-5 pb-4">
        <p className="text-base leading-relaxed">These two may be the same person. Choose the one to <strong>keep</strong>. Nothing changes until you press and hold the green button.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card guest={ga} keep={keepGuest.id === ga.id} onKeep={() => setKeepId(ga.id)} />
          <Card guest={gb} keep={keepGuest.id === gb.id} onKeep={() => setKeepId(gb.id)} />
        </div>

        <section className="space-y-2 rounded-lg border border-line bg-surface-2 p-4" aria-label="What will happen">
          <h3 className="text-lg font-semibold">What will happen</h3>
          <ul className="space-y-2 text-base leading-relaxed">
            <li className="flex gap-2"><ArrowRight size={18} aria-hidden="true" className="mt-1 shrink-0" /> All <strong>{stayCount(other)} {stayCount(other) === 1 ? 'stay' : 'stays'}</strong> of “{other.name}” move to “{keepGuest.name}”, who then has <strong>{stayCount(keepGuest) + stayCount(other)}</strong> in total.</li>
            <li className="flex gap-2"><ArrowRight size={18} aria-hidden="true" className="mt-1 shrink-0" /> The name stays “{keepGuest.name}”.{filled.length > 0 ? ` The ${filled.map((k) => label[k]).join(' and ')} that “${keepGuest.name}” does not have yet will be filled in from “${other.name}”.` : ' Their own details stay as they are.'}</li>
            <li className="flex gap-2"><Note size={18} aria-hidden="true" className="mt-1 shrink-0" /> Both guests’ notes are kept. A line in the notes records the merge and the old details, so nothing is lost.</li>
            <li className="flex gap-2"><ArrowRight size={18} aria-hidden="true" className="mt-1 shrink-0" /> “{other.name}” then disappears from the Guests list. This cannot be undone with one tap.</li>
          </ul>
        </section>
        {error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-base text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
