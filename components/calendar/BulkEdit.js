import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Buildings, CalendarBlank, Check, Clock, Minus, Note, Plus, SignIn, SignOut, Tag, TextAa, X } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import TimeSelect from '../TimeSelect';
import ColorPicker from '../booking/ColorPicker';
import { FoldSection, Segmented } from '../FilterParts';
import { useSettings } from '../SettingsProvider';
import { colorFor, roomShade } from '../../lib/colors';
import { newDates } from '../../lib/bulkEdit';
import { fmtShort } from '../../lib/dates';

/*
  The group edit. Opened with the Edit button it is every job in one form (four sections that fold); opened from one of the
  big buttons ("Move dates", "Rename", "Times", "Status and colour") it is just that job, on its own screen with a Back arrow.
  Everything is optional: only what you change is saved. Two things keep it from ever being a surprise:
    the calendar behind it shows a ghost (a see-through bar) where each booking would land, while you change the dates;
    the Save bar stays at the bottom and says in words what is about to change.
  onApply(change, renames): change is what lib/bulkEdit.js reads; renames is [{ booking, name }] for every booking.
  onPreview(preview | null): the ghosts for the calendar (the same shape the New Booking form uses).
*/
const nameKey = (b) => `b${b.id}`;
const JOBS = {
  names: { title: 'Rename', icon: TextAa },
  dates: { title: 'Move dates', icon: CalendarBlank },
  times: { title: 'Times', icon: Clock },
  more: { title: 'Status and colour', icon: Tag },
};
const STATUS_CHOICES = [['', 'Leave as is'], ['confirmed', 'Confirmed'], ['checked_in', 'Checked in'], ['on_hold', 'On hold']];

// One part of the form: a section that folds in the full edit; alone (no heading, the screen has its own) when opened for one job.
function Part({ only, name, id, title, icon: Icon, badge, defaultOpen = false, children }) {
  if (only && only !== name) return null;
  if (only) return <div className="space-y-4">{children}</div>;
  return <FoldSection id={id} title={title} icon={Icon} badge={badge} defaultOpen={defaultOpen}>{children}</FoldSection>;
}

// A big plus and minus with the result in words between them, so the effect is read, not worked out.
function Stepper({ label, icon, text, on, minus, plus, minusLabel, plusLabel }) {
  const btn = 'btn size-12 shrink-0 border-line p-0 lg:size-12';
  return (
    <div>
      <FieldLabel as="span" icon={icon}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} aria-label={minusLabel} onClick={minus}><Minus size={20} weight="bold" aria-hidden="true" /></button>
        <span className={`min-w-0 flex-1 rounded-lg border-2 px-3 py-2.5 text-center text-lg font-semibold transition-colors duration-150 ${on ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-muted'}`} aria-live="polite">{text}</span>
        <button type="button" className={btn} aria-label={plusLabel} onClick={plus}><Plus size={20} weight="bold" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

export default function BulkEdit({ bookings, onApply, onCancel, only, onPreview }) {
  const { settings } = useSettings();
  const [names, setNames] = useState(() => Object.fromEntries(bookings.map((b) => [nameKey(b), b.name])));
  const cells = useRef([]);
  const [shift, setShift] = useState(0);
  const [extend, setExtend] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [changeIn, setChangeIn] = useState(false);
  const [timeIn, setTimeIn] = useState('');
  const [changeOut, setChangeOut] = useState(false);
  const [timeOut, setTimeOut] = useState('');
  const [status, setStatus] = useState('');
  const [organization, setOrganization] = useState('');
  const [noteAdd, setNoteAdd] = useState('');
  const [changeColor, setChangeColor] = useState(false);
  const [color, setColor] = useState(null);

  const change = {
    ...(shift ? { shift } : {}),
    ...(extend ? { extend } : {}),
    ...(checkIn ? { checkIn } : {}),
    ...(checkOut ? { checkOut } : {}),
    ...(changeIn ? { check_in_time: timeIn || null } : {}),
    ...(changeOut ? { check_out_time: timeOut || null } : {}),
    ...(status ? { status } : {}),
    ...(organization.trim() ? { organization: organization.trim() } : {}),
    ...(noteAdd.trim() ? { noteAdd } : {}),
    ...(changeColor ? { color } : {}),
  };
  const renamed = bookings.filter((b) => (names[nameKey(b)] ?? b.name).trim() && (names[nameKey(b)] ?? b.name).trim() !== b.name);
  const datesChange = Boolean(shift || extend || checkIn || checkOut);
  const preview = bookings.map((b) => ({ b, d: newDates(b, change) }));
  const bad = preview.filter(({ d }) => !d.valid);
  const moved = (n, a, b) => (n === 0 ? a : `${Math.abs(n)} ${Math.abs(n) === 1 ? 'day' : 'days'} ${n > 0 ? b[0] : b[1]}`);
  const whenText = moved(shift, 'No move', ['later', 'earlier']);
  const longerText = extend === 0 ? 'Same length' : `${Math.abs(extend)} ${Math.abs(extend) === 1 ? 'night' : 'nights'} ${extend > 0 ? 'longer' : 'shorter'}`;

  // The ghosts on the calendar: where each booking would land (same room), while the dates are being changed.
  const ghosts = datesChange ? preview.filter(({ d }) => d.valid).map(({ b, d }) => ({ roomIds: [b.room_id], checkIn: d.checkIn, checkOut: d.checkOut })) : [];
  const ghostKey = JSON.stringify(ghosts);
  useEffect(() => {
    onPreview?.(ghosts.length ? { stays: ghosts, tone: { border: 'var(--ink)', fillPct: 26 }, name: '→', locked: true } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostKey]);
  useEffect(() => () => onPreview?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  // What is about to change, in words, for the Save bar.
  const parts = [
    renamed.length && `${renamed.length} ${renamed.length === 1 ? 'name' : 'names'}`,
    datesChange && 'dates',
    (changeIn || changeOut) && 'times',
    status && 'status',
    organization.trim() && 'organization',
    noteAdd.trim() && 'a note',
    changeColor && 'colour',
  ].filter(Boolean);
  const anything = parts.length > 0;
  const counts = {
    dates: (shift ? 1 : 0) + (extend ? 1 : 0) + (checkIn ? 1 : 0) + (checkOut ? 1 : 0),
    times: (changeIn ? 1 : 0) + (changeOut ? 1 : 0),
    more: (status ? 1 : 0) + (organization.trim() ? 1 : 0) + (noteAdd.trim() ? 1 : 0) + (changeColor ? 1 : 0),
  };

  const submit = (e) => {
    e.preventDefault();
    if (anything && bad.length === 0) onApply(change, bookings.map((b) => ({ booking: b, name: names[nameKey(b)] ?? b.name })));
  };
  const job = only ? JOBS[only] : null;
  const statusOptions = STATUS_CHOICES.map(([v, l]) => [v, l, v ? (({ bg, border }) => ({ fill: bg, edge: border }))(colorFor({ status: v }, settings)) : undefined]);
  const rooms = [...new Set(bookings.map((b) => b.room_number))].sort().join(', ');

  return (
    <form onSubmit={submit} className="space-y-4">
      {job ? (
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-icon shrink-0" onClick={onCancel} aria-label="Back to the choices" title="Back to the choices">
            <ArrowLeft size={20} weight="bold" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-xl font-semibold leading-tight"><job.icon size={22} aria-hidden="true" /> {job.title}</h3>
            <p className="truncate text-base text-muted">{bookings.length} bookings, rooms {rooms}</p>
          </div>
        </div>
      ) : (
        <p className="text-base leading-relaxed">Editing <strong>{bookings.length} bookings</strong> together. Change only what should change; the rest stays as it is.</p>
      )}

      <div className={only ? 'space-y-4' : 'space-y-2'}>
        <Part only={only} name="names" id="group-names" title="Names" icon={TextAa} badge={renamed.length} defaultOpen>
          <ul className="-mx-1 space-y-2">
            {bookings.map((b, i) => {
              const shade = roomShade({ number: b.room_number }, settings);
              return (
                <li key={b.id} className="flex items-center gap-2 px-1">
                  <span className="w-14 shrink-0 rounded-lg px-1.5 py-2 text-center font-mono text-base font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>
                    {b.room_number}
                  </span>
                  <input
                    ref={(el) => { cells.current[i] = el; }}
                    name={`name-${b.id}`}
                    aria-label={`Name for room ${b.room_number}`}
                    className="field"
                    value={names[nameKey(b)] ?? ''}
                    onChange={(e) => setNames({ ...names, [nameKey(b)]: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && i < bookings.length - 1) {
                        e.preventDefault();
                        cells.current[i + 1]?.focus();
                      }
                    }}
                    autoComplete="off"
                  />
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted">Only the bookings you rename are changed. Give every booking of one guest the same new name to rename the guest itself.</p>
        </Part>

        <Part only={only} name="dates" id="group-dates" title="Dates" icon={CalendarBlank} badge={counts.dates} defaultOpen>
          <Stepper
            label="Move everyone"
            icon={CalendarBlank}
            text={whenText}
            on={shift !== 0}
            minus={() => setShift(shift - 1)}
            plus={() => setShift(shift + 1)}
            minusLabel="One day earlier"
            plusLabel="One day later"
          />
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick moves, in days">
            {[-7, -1, 1, 7].map((n) => (
              <button key={n} type="button" className="btn min-h-11 px-1 text-base" aria-label={`${Math.abs(n)} ${Math.abs(n) === 1 ? 'day' : 'days'} ${n > 0 ? 'later' : 'earlier'}`} onClick={() => setShift(shift + n)}>{n > 0 ? '+' : '-'}{Math.abs(n)}</button>
            ))}
          </div>
          <p className="-mt-2 flex items-center justify-between text-sm text-muted">
            <span>Quick moves, in days</span>
            {shift !== 0 && <button type="button" className="btn min-h-9 border-transparent px-2 text-sm" onClick={() => setShift(0)}>Reset</button>}
          </p>
          <Stepper
            label="Make every stay longer or shorter"
            icon={SignOut}
            text={longerText}
            on={extend !== 0}
            minus={() => setExtend(extend - 1)}
            plus={() => setExtend(extend + 1)}
            minusLabel="One night shorter"
            plusLabel="One night longer"
          />
          <p className="-mt-2 text-sm text-muted">The check-out day moves; the check-in day stays.</p>

          <FoldSection id="group-exact" title="Or pick exact dates" icon={SignIn} badge={(checkIn ? 1 : 0) + (checkOut ? 1 : 0)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel icon={SignIn} htmlFor="bulk-in">Same check-in for all</FieldLabel>
                <input id="bulk-in" type="date" className="field" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div>
                <FieldLabel icon={SignOut} htmlFor="bulk-out">Same check-out for all</FieldLabel>
                <input id="bulk-out" type="date" className="field" value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
            </div>
            <p className="text-sm text-muted">A date picked here replaces the move for that end. A room that is already taken on the new days will stop the change.</p>
          </FoldSection>

          {/* The result, always in view: each booking before and after, and a ghost for each on the calendar. */}
          <div aria-label="Before and after" className="space-y-2 rounded-lg bg-surface-2 p-3">
            <p className="text-base font-semibold">{datesChange ? 'Before and after' : 'Where they are now'}</p>
            <ul className="space-y-2.5 text-base">
              {preview.map(({ b, d }) => (
                <li key={b.id} className={d.valid ? '' : 'text-danger'}>
                  <span className="font-mono font-semibold">{b.room_number}</span> <span className="break-words">{b.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
                    {datesChange ? (
                      <>
                        <span className="text-muted line-through">{fmtShort(b.check_in)} to {fmtShort(b.check_out)}</span>
                        <ArrowRight size={14} weight="bold" aria-hidden="true" />
                        <span><span className="font-semibold text-accent-text">{fmtShort(d.checkIn)}</span> to <span className="font-semibold text-danger">{fmtShort(d.checkOut)}</span></span>
                        {!d.valid && <strong>ends before it starts</strong>}
                      </>
                    ) : (
                      <span><span className="text-accent-text">{fmtShort(b.check_in)}</span> to <span className="text-danger">{fmtShort(b.check_out)}</span></span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {datesChange && <p className="text-sm text-muted">The dark dashed bars on the calendar show where they will land.</p>}
          </div>
          {bad.length > 0 && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-base text-danger">Some stays would end before they start. Change the dates so every stay has at least one night.</p>}
        </Part>

        <Part only={only} name="times" id="group-times" title="Times" icon={Clock} badge={counts.times}>
          <Segmented legend="Check-in time" icon={SignIn} options={[['keep', 'Leave as is'], ['set', 'Set a time']]} value={changeIn ? 'set' : 'keep'} onChange={(v) => setChangeIn(v === 'set')} />
          {changeIn && <TimeSelect id="bulk-time-in" icon={SignIn} label="Check-in time for all" value={timeIn} onChange={setTimeIn} />}
          <Segmented legend="Check-out time" icon={SignOut} options={[['keep', 'Leave as is'], ['set', 'Set a time']]} value={changeOut ? 'set' : 'keep'} onChange={(v) => setChangeOut(v === 'set')} />
          {changeOut && <TimeSelect id="bulk-time-out" icon={SignOut} label="Check-out time for all" value={timeOut} onChange={setTimeOut} />}
        </Part>

        <Part only={only} name="more" id="group-more" title="Status, note and colour" icon={Tag} badge={counts.more}>
          <Segmented legend="Status" icon={Tag} options={statusOptions} value={status} onChange={setStatus} />
          <div>
            <FieldLabel icon={Buildings} htmlFor="bulk-org">Organization</FieldLabel>
            <input id="bulk-org" className="field" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Leave empty to keep each one's own" autoComplete="off" />
          </div>
          <div>
            <FieldLabel icon={Note} htmlFor="bulk-note">Add a note to each</FieldLabel>
            <textarea id="bulk-note" rows={2} className="field" value={noteAdd} onChange={(e) => setNoteAdd(e.target.value)} placeholder="Added to the end of each booking's notes" />
          </div>
          <Segmented legend="Colour" options={[['keep', 'Leave as is'], ['set', 'Change it']]} value={changeColor ? 'set' : 'keep'} onChange={(v) => setChangeColor(v === 'set')} />
          {changeColor && <ColorPicker id="bulk-color" label="Colour for all" autoLabel="Automatic" color={color} onChange={setColor} />}
        </Part>
      </div>

      {/* The Save bar stays at the bottom of the panel however far the form is scrolled, and says what will change. */}
      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-line bg-surface px-4 py-3">
        <p className="text-base" aria-live="polite">
          {anything ? <><strong>Will change:</strong> {parts.join(', ')}.</> : <span className="text-muted">Nothing changed yet.</span>}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn min-h-12 flex-1 gap-2 text-base" onClick={onCancel}>
            {only ? <ArrowLeft size={18} weight="bold" aria-hidden="true" /> : <X size={18} weight="bold" aria-hidden="true" />} {only ? 'Back' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn btn-primary min-h-12 flex-[2] gap-2 text-base disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:opacity-100 disabled:shadow-none"
            disabled={!anything || bad.length > 0}
          >
            <Check size={18} weight="bold" aria-hidden="true" /> {anything ? 'Save Changes' : 'Nothing to save yet'}
          </button>
        </div>
      </div>
    </form>
  );
}
