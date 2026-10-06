import { CaretDown, Baby, Megaphone, Note, Receipt, SlidersHorizontal, Users } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import ColorPicker from './ColorPicker';
import StatusPicker from './StatusPicker';
import { Choice } from './formParts';
import { CHANNELS, RATE_PLANS } from './bookingOptions';

// Everything that is not needed for most bookings, folded away so the form fits on screen.
// hideParty: the adults and children fields are elsewhere (step 1 of a new booking, the Guests part of the edit form).
// hideStatus: the status is shown elsewhere too (its own part of the edit form).
// hideColor: the colour is chosen elsewhere (step 1 of a new booking).
export default function MoreOptions({ f, defaultOpen = false, hideParty = false, hideStatus = false, hideColor = false }) {
  return (
    <details className="group card p-0" open={defaultOpen || undefined}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-base font-semibold">
            <SlidersHorizontal size={18} aria-hidden="true" className="shrink-0 text-muted" /> More options
          </span>
          <span className="block text-sm leading-snug text-muted">How they booked, meals, notes</span>
        </span>
        <CaretDown size={18} aria-hidden="true" className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="details-body space-y-4 border-t border-line p-3">
        {!hideStatus && <StatusPicker value={f.status} onChange={f.setStatus} />}
        {!hideParty && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel icon={Users} htmlFor="b-adults">Adults</FieldLabel>
              <input id="b-adults" name="adults" autoComplete="off" type="number" inputMode="numeric" min="1" className="field" value={f.adults} onChange={(e) => f.setAdults(e.target.value)} />
            </div>
            <div>
              <FieldLabel icon={Baby} htmlFor="b-children">Children</FieldLabel>
              <input id="b-children" name="children" autoComplete="off" type="number" inputMode="numeric" min="0" className="field" value={f.children} onChange={(e) => f.setChildren(e.target.value)} />
            </div>
          </div>
        )}

        <Choice icon={Megaphone} id="b-channel" label="How did they book?" options={[...new Set([...CHANNELS, f.channel])].map((c) => [c, c])} value={f.channel} onChange={f.setChannel} />
        <Choice icon={Receipt} id="b-rate" label="Meals included" options={RATE_PLANS} value={f.ratePlan} onChange={f.setRatePlan} />

        {!hideColor && <ColorPicker color={f.color} onChange={f.setColor} hint="Auto uses the guest's colour, else the status colour." />}

        <div>
          <FieldLabel icon={Note} htmlFor="b-notes">Notes</FieldLabel>
          <textarea id="b-notes" name="notes" rows={3} className="field" value={f.notes} onChange={(e) => f.setNotes(e.target.value)} />
        </div>
      </div>
    </details>
  );
}
