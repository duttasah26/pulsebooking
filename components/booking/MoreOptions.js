import { CaretDown, Baby, Megaphone, Note, Receipt, Users } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import ColorPicker from './ColorPicker';
import StatusPicker from './StatusPicker';
import { CHANNELS, RATE_PLANS } from './bookingOptions';

// Everything that is not needed for most bookings, folded away so the form fits on screen.
// hideParty: the adults and children fields are elsewhere (step 1 of a new booking, the Guests part of the edit form).
// hideStatus: the status is shown elsewhere too (its own part of the edit form).
// hideColor: the colour is chosen elsewhere (step 1 of a new booking).
export default function MoreOptions({ f, defaultOpen = false, hideParty = false, hideStatus = false, hideColor = false }) {
  return (
    <details className="group card p-0" open={defaultOpen || undefined}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-2 transition-colors hover:bg-surface-2">
        <span className="text-[1.0625rem] font-semibold">More options</span>
        {/* What is set now, so the card need not be opened to know: how they booked, the meal plan, and whether there is a note. */}
        <span className="ml-auto min-w-0 truncate text-[0.9375rem] text-muted group-open:hidden">{[f.channel, f.ratePlan, f.notes.trim() && 'note'].filter(Boolean).join(', ')}</span>
        <CaretDown size={18} aria-hidden="true" className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="details-body space-y-4 px-4 pb-4 pt-1">
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

        <div className="grid gap-4">
          <div>
            <FieldLabel icon={Megaphone} htmlFor="b-channel">How did they book?</FieldLabel>
            <select id="b-channel" name="channel" className="field" value={f.channel} onChange={(e) => f.setChannel(e.target.value)}>
              {[...new Set([...CHANNELS, f.channel])].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel icon={Receipt} htmlFor="b-rate">Meals included</FieldLabel>
            <select id="b-rate" name="rate_plan" className="field" value={f.ratePlan} onChange={(e) => f.setRatePlan(e.target.value)}>
              {RATE_PLANS.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
            </select>
          </div>
        </div>

        {!hideColor && <ColorPicker color={f.color} onChange={f.setColor} />}

        <div>
          <FieldLabel icon={Note} htmlFor="b-notes">Notes</FieldLabel>
          <textarea id="b-notes" name="notes" rows={2} className="field" value={f.notes} onChange={(e) => f.setNotes(e.target.value)} />
        </div>
      </div>
    </details>
  );
}
