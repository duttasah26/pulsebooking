import { useState } from 'react';
import {
  ArrowCounterClockwise, Bed, CalendarBlank, Clock, Palette, SignIn, SignOut, SlidersHorizontal, TextAa, UserCircle,
} from '@phosphor-icons/react';
import Layout from '../components/Layout';
import TimeSelect from '../components/TimeSelect';
import ColorPicker from '../components/booking/ColorPicker';
import { Segmented } from '../components/FilterParts';
import AccountPanel from '../components/settings/AccountPanel';
import { useSettings } from '../components/SettingsProvider';
import { useToast } from '../components/Toast';
import { floorLabel, floorOf } from '../components/calendar/floors';
import { STATUS_SWATCHES, roomShade, statusColor, stayColor } from '../lib/colors';
import { api, useApi } from '../lib/useApi';
import { useQueryState } from '../lib/useQueryState';

/*
  Settings, in tabs. On a wide screen the tabs are listed on the left; on a phone they are a row of buttons under the header.
  Each tab is its own screen, and the tab you are on is in the address (?tab=account), so it survives a reload:
    Look and feel   the text size of this device, and the colours
    Bookings        usual times and automatic check-out
    Calendar        what it opens with
    Rooms           which rooms are on
    Account         who you are, Sign Out and changing your password (it used to be a separate page in the header)
  Every change saves by itself: colours, times and calendar choices are shared by everyone; the text size is for this device
  only (and the page says which is which, on each group).
*/
const STATUSES = [
  { key: 'confirmed', label: 'Confirmed Bookings' },
  { key: 'on_hold', label: 'On-hold Bookings' },
];
const STAY_ROWS = [
  { key: 'checkIn', label: 'Check-in Day', sample: 'Check-in' },
  { key: 'checkOut', label: 'Check-out Day', sample: 'Check-out' },
];
const TABS = [
  { id: 'look', label: 'Look and feel', Icon: Palette },
  { id: 'bookings', label: 'Bookings', Icon: Clock },
  { id: 'calendar', label: 'Calendar', Icon: CalendarBlank },
  { id: 'rooms', label: 'Rooms', Icon: Bed },
  { id: 'account', label: 'Account', Icon: UserCircle },
];

// One group of settings: a clear heading, who it applies to, and the settings under it.
function Group({ id, icon: Icon, title, scope, hint, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 space-y-5 rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-semibold"><Icon size={22} aria-hidden="true" /> {title}</h2>
          {scope && <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-sm font-medium text-muted">{scope}</span>}
        </div>
        {hint && <p className="text-base text-ink/80">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// One setting: its name and what it does, with the control below.
function Setting({ label, hint, children }) {
  return (
    <div className="space-y-2 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div>
        <p className="text-base font-semibold">{label}</p>
        {hint && <p className="text-base text-ink/80">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// An on or off switch, large enough to hit with a thumb.
function Switch({ label, hint, checked, onChange }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-4 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{label}</span>
        {hint && <span className="block text-base text-ink/80">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative h-9 w-16 shrink-0 rounded-lg border border-line bg-surface-2 transition-colors duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-checked:[&>span]:translate-x-7"
      >
        <span className="absolute left-1 top-1 size-7 rounded-md bg-surface shadow transition-transform duration-200" />
      </span>
      <span className="w-9 shrink-0 text-base font-semibold" aria-hidden="true">{checked ? 'On' : 'Off'}</span>
    </label>
  );
}

// The sample of a colour next to its picker.
function Row({ sample, children }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[7.5rem_1fr]">
      <div>{sample}</div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { settings, save, textSize, setTextSize } = useSettings();
  const toast = useToast();
  const rooms = useApi('/api/rooms?all=1');
  const [saved, setSaved] = useState('');
  const [tabParam, setTab] = useQueryState('tab', 'look');
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'look';

  // Every change saves by itself and says so.
  const apply = async (change, said = 'Saved') => {
    try {
      await save(change);
      setSaved(said);
    } catch (err) {
      toast({ message: `Could not save: ${err.message}`, important: true });
    }
  };

  const roomList = rooms.data ?? [];
  const floors = [...new Set(['1', '2', '3', ...roomList.map(floorOf)])].sort();

  const setActive = async (room, active) => {
    try {
      await api(`/api/rooms/${room.id}`, { method: 'PATCH', body: { active } });
      rooms.reload();
      setSaved('Saved');
    } catch (err) {
      toast({ message: err.message });
    }
  };
  const resetColours = () => apply(
    { floorColors: Object.fromEntries(floors.map((f) => [f, null])), statusColors: { confirmed: null, on_hold: null }, stayColors: { checkIn: null, checkOut: null } },
    'Colours put back to the standard ones',
  );

  return (
    <Layout title="Settings">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-base text-ink/80">Every change saves by itself. Each group says whether it is for everyone or just this device.</p>
          </div>
          <p role="status" aria-live="polite" className="min-h-6 text-base font-semibold text-accent-text">{saved}</p>
        </div>

        <div className="mt-4 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div
            role="tablist"
            aria-label="Settings"
            className="no-scrollbar sticky top-14 z-20 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-canvas px-4 py-2 lg:top-20 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:px-0 lg:py-0"
          >
            {TABS.map(({ id, label, Icon }) => {
              const on = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={on}
                  aria-controls="settings-panel"
                  onClick={() => { setTab(id); setSaved(''); }}
                  className={`btn shrink-0 justify-start gap-2 px-3 text-base lg:min-h-11 ${on ? 'border-accent bg-accent-soft font-semibold text-accent-text' : ''}`}
                >
                  <Icon size={18} weight={on ? 'fill' : 'regular'} aria-hidden="true" className={`shrink-0 ${on ? '' : 'text-muted'}`} />
                  {label}
                </button>
              );
            })}
          </div>

          <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-6">
            {tab === 'look' && (
              <>
            <Group id="looks" icon={TextAa} title="Text size" scope="This device only" hint="Makes every word in the app bigger on this phone or computer. Other devices keep their own size.">
              <Segmented
                legend="Text size"
                legendHidden
                options={[['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']]}
                value={textSize}
                onChange={(v) => { setTextSize(v); setSaved('Text size changed on this device'); }}
              />
              <p className="rounded-lg bg-surface-2 p-3 text-base leading-relaxed">
                Room 101 is free from Sat 10 Oct to Sun 11 Oct. Tap a day to see who is arriving and leaving.
              </p>
            </Group>

            <Group id="colours" icon={Palette} title="Colours" scope="Everyone" hint="The colours used on the calendar and in the lists. Each one shows a sample of how it will look.">
              <Setting label="Floors" hint="Each floor's room numbers share one colour. The first digit of a room number is its floor.">
                <div className="space-y-5">
                  {floors.map((f) => {
                    const tone = roomShade({ number: f }, settings);
                    return (
                      <Row
                        key={f}
                        sample={
                          <span className="inline-flex min-h-9 min-w-24 items-center justify-center rounded-lg border px-3 font-mono text-sm font-semibold" style={{ backgroundColor: tone.fill, borderColor: tone.edge }}>
                            {f}01
                          </span>
                        }
                      >
                        <ColorPicker id={`floor-${f}`} label={floorLabel(f)} autoLabel="Default" swatches={STATUS_SWATCHES} color={settings.floorColors[f] ?? null} onChange={(color) => apply({ floorColors: { [f]: color } })} />
                      </Row>
                    );
                  })}
                </div>
              </Setting>

              <Setting label="Bookings" hint="Used for bookings that have no colour of their own and whose guest has none.">
                <div className="space-y-5">
                  {STATUSES.map(({ key, label }) => {
                    const tone = statusColor(key, settings);
                    return (
                      <Row
                        key={key}
                        sample={
                          <span className={`inline-flex min-h-9 min-w-24 items-center justify-center rounded-lg border px-3 text-sm font-medium ${key === 'on_hold' ? 'border-dashed' : ''}`} style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
                            {key === 'on_hold' ? 'On hold' : 'Confirmed'}
                          </span>
                        }
                      >
                        <ColorPicker id={`status-${key}`} label={label} autoLabel="Default" swatches={STATUS_SWATCHES} color={settings.statusColors[key] ?? null} onChange={(color) => apply({ statusColors: { [key]: color } })} />
                      </Row>
                    );
                  })}
                </div>
              </Setting>

              <Setting label="First and last day of a stay" hint="Shown in the date picker of the booking form, and in the Arriving and Leaving filters.">
                <div className="space-y-5">
                  {STAY_ROWS.map(({ key, label, sample }) => {
                    const tone = stayColor(key, settings);
                    return (
                      <Row
                        key={key}
                        sample={
                          <span className="inline-flex min-h-9 min-w-24 items-center justify-center rounded-lg border-2 px-3 text-sm font-semibold" style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
                            {sample}
                          </span>
                        }
                      >
                        <ColorPicker id={`stay-${key}`} label={label} autoLabel="Default" swatches={STATUS_SWATCHES} color={settings.stayColors?.[key] ?? null} onChange={(color) => apply({ stayColors: { [key]: color } })} />
                      </Row>
                    );
                  })}
                </div>
              </Setting>

              <button type="button" className="btn gap-2 px-3" onClick={resetColours}>
                <ArrowCounterClockwise size={18} aria-hidden="true" /> Put all colours back to standard
              </button>
            </Group>

              </>
            )}

            {tab === 'bookings' && (
            <Group id="bookings" icon={Clock} title="Bookings" scope="Everyone" hint="How new bookings start, and what the app does by itself.">
              <Setting label="Usual times" hint="Filled in on every new booking. Each booking can still change them.">
                <div className="grid grid-cols-2 gap-3">
                  <TimeSelect id="s-in-time" icon={SignIn} label="Check-in time" value={settings.checkInTime} onChange={(v) => apply({ checkInTime: v })} />
                  <TimeSelect id="s-out-time" icon={SignOut} label="Check-out time" value={settings.checkOutTime} onChange={(v) => apply({ checkOutTime: v })} />
                </div>
              </Setting>
              <Switch
                label="Check guests out automatically"
                hint="Once the leaving day and time have passed, a stay changes to Checked out by itself. Switch off if you prefer to do it by hand. Checking in is always by hand."
                checked={settings.autoCheckout !== false}
                onChange={(on) => apply({ autoCheckout: on }, on ? 'Automatic check-out is on' : 'Automatic check-out is off')}
              />
            </Group>

            )}

            {tab === 'calendar' && (
            <Group id="calendar" icon={SlidersHorizontal} title="Calendar" scope="Everyone" hint="What the calendar shows when you open it. You can still change it any time from the toolbar.">
              <Setting label="Open the calendar with" hint="The view you see first.">
                <Segmented
                  legend="Opening view"
                  legendHidden
                  options={[['timeline', 'Timeline'], ['month', 'Month'], ['calendar', 'Occupancy'], ['day', 'Day']]}
                  value={settings.defaultView}
                  onChange={(v) => apply({ defaultView: v })}
                />
              </Setting>
              <Setting label="Days in the timeline" hint="How many days fit across the Timeline when it opens. Automatic is 7 on a phone and 14 on a bigger screen.">
                <Segmented
                  legend="Days in the timeline"
                  legendHidden
                  options={[['auto', 'Automatic'], ['7', '7 days'], ['14', '14 days'], ['30', '30 days'], ['month', 'Whole month']]}
                  value={settings.defaultSpan}
                  onChange={(v) => apply({ defaultSpan: v })}
                />
              </Setting>
            </Group>

            )}

            {tab === 'rooms' && (
            <Group id="rooms" icon={Bed} title="Rooms" scope="Everyone" hint="Switch a room off to hide it from the calendar. Its bookings are kept.">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {roomList.map((r) => {
                  const tone = roomShade(r, settings);
                  return (
                    <li key={r.id}>
                      <label className="btn cursor-pointer justify-start gap-2 px-3 focus-within:outline-2 focus-within:outline-accent" style={{ borderColor: r.active ? tone.edge : undefined }}>
                        <input type="checkbox" name={`room-${r.number}`} className="size-5 accent-[var(--accent)]" checked={r.active} onChange={(e) => setActive(r, e.target.checked)} />
                        <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: tone.fill }} />
                        <span className={`font-mono ${r.active ? '' : 'text-muted line-through'}`}>{r.number}</span>
                        {!r.active && <span className="text-sm text-muted">off</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Group>

            )}

            {tab === 'account' && <AccountPanel />}
          </div>
        </div>
      </div>
    </Layout>
  );
}
