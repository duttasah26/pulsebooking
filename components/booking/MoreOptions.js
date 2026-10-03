import { Baby, CaretDown, Megaphone, Note, Receipt, SlidersHorizontal, Tag, Users } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import ColorPicker from './ColorPicker';
import HistoryList from './HistoryList';
import { CHANNELS, RATE_PLANS } from './bookingOptions';
import { STATUS_OPTIONS } from '../../lib/status';

// Everything that is not needed for most bookings, folded away so the form fits on screen.
export default function MoreOptions({ f }) {
  return (
    <details className="group rounded-lg border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium lg:min-h-8">
        <span className="flex items-center gap-1.5"><SlidersHorizontal size={16} aria-hidden="true" /> More Options</span>
        <CaretDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        <div className="grid grid-cols-2 gap-3">
          {!f.edit && (
            <div className="col-span-2">
              <FieldLabel icon={Tag} htmlFor="b-status">Status</FieldLabel>
              <select id="b-status" name="status" className="field" value={f.status} onChange={(e) => f.setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <div>
            <FieldLabel icon={Users} htmlFor="b-adults">Adults</FieldLabel>
            <input id="b-adults" name="adults" autoComplete="off" type="number" inputMode="numeric" min="1" className="field" value={f.adults} onChange={(e) => f.setAdults(e.target.value)} />
          </div>
          <div>
            <FieldLabel icon={Baby} htmlFor="b-children">Children</FieldLabel>
            <input id="b-children" name="children" autoComplete="off" type="number" inputMode="numeric" min="0" className="field" value={f.children} onChange={(e) => f.setChildren(e.target.value)} />
          </div>
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

        <ColorPicker color={f.color} onChange={f.setColor} />

        <div>
          <FieldLabel icon={Note} htmlFor="b-notes">Notes</FieldLabel>
          <textarea id="b-notes" name="notes" rows={2} className="field" value={f.notes} onChange={(e) => f.setNotes(e.target.value)} />
        </div>

        {f.edit && <HistoryList history={f.history} />}
      </div>
    </details>
  );
}
