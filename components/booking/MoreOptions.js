import { Baby, CaretDown, Megaphone, Note, Receipt, SlidersHorizontal, Users } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import ColorPicker from './ColorPicker';
import StatusPicker from './StatusPicker';
import { CHANNELS, RATE_PLANS } from './bookingOptions';

// Everything that is not needed for most bookings, folded away so the form fits on screen.
// hideParty: the adults and children fields are elsewhere (step 1 of a new booking, the Guests part of the edit form).
// hideStatus: the status is shown elsewhere too (its own part of the edit form).
export default function MoreOptions({ f, defaultOpen = false, hideParty = false, hideStatus = false }) {
  return (
    <details className="group rounded-lg border border-line" open={defaultOpen || undefined}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium lg:min-h-8">
        <span className="flex items-center gap-1.5"><SlidersHorizontal size={16} aria-hidden="true" /> More Options</span>
        <CaretDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        <div className="grid grid-cols-2 gap-3">
          {!hideStatus && (
            <div className="col-span-2">
              <StatusPicker value={f.status} onChange={f.setStatus} />
            </div>
          )}
          {!hideParty && (
            <>
              <div>
                <FieldLabel icon={Users} htmlFor="b-adults">Adults</FieldLabel>
                <input id="b-adults" name="adults" autoComplete="off" type="number" inputMode="numeric" min="1" className="field" value={f.adults} onChange={(e) => f.setAdults(e.target.value)} />
              </div>
              <div>
                <FieldLabel icon={Baby} htmlFor="b-children">Children</FieldLabel>
                <input id="b-children" name="children" autoComplete="off" type="number" inputMode="numeric" min="0" className="field" value={f.children} onChange={(e) => f.setChildren(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <FieldLabel icon={Megaphone} htmlFor="b-channel">Booked Via</FieldLabel>
            <select id="b-channel" name="channel" className="field" value={f.channel} onChange={(e) => f.setChannel(e.target.value)}>
              {[...new Set([...CHANNELS, f.channel])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel icon={Receipt} htmlFor="b-rate">Rate Plan</FieldLabel>
            <select id="b-rate" name="rate_plan" className="field" value={f.ratePlan} onChange={(e) => f.setRatePlan(e.target.value)}>
              {RATE_PLANS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <ColorPicker color={f.color} onChange={f.setColor} hint="Auto uses the guest's colour, else the status colour." />

        <div>
          <FieldLabel icon={Note} htmlFor="b-notes">Notes</FieldLabel>
          <textarea id="b-notes" name="notes" rows={2} className="field" value={f.notes} onChange={(e) => f.setNotes(e.target.value)} />
        </div>
      </div>
    </details>
  );
}
