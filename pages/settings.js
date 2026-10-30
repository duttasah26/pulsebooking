import { useEffect, useRef, useState } from 'react';
import { Bed, CalendarBlank, Clock, Palette, SignIn, SignOut, SlidersHorizontal, TextAa, UserCircle } from '@phosphor-icons/react';
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
import { OVERVIEW_PARTS, useFirstView, useOverviewParts, useRowSize, useShowDone } from '../lib/devicePrefs';

/*
  Settings, in tabs. On a wide screen the tabs are listed on the left; on a phone they are a row of buttons under the header.
  Each tab is its own screen, and the tab you are on is in the address (?tab=account), so it survives a reload:
    Look and feel   the text size of this device, and the colours
    Calendar        how the calendar opens and looks on this device, and the Overview panel
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
  { id: 'calendar', label: 'Calendar', Icon: CalendarBlank },
  { id: 'bookings', label: 'Bookings', Icon: Clock },
  { id: 'rooms', label: 'Rooms', Icon: Bed },
  { id: 'account', label: 'Account', Icon: UserCircle },
];

// One group of settings: a clear heading, who it applies to, and the settings under it.
function Group({ id, icon: Icon, title, scope, hint, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 space-y-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={`${id}-title`} className="t-title">{title}</h2>
          {scope && <span className="badge">{scope}</span>}
        </div>
        {hint && <p className="t-footnote">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// One setting: its name and what it does, with the control below.
function Setting({ label, hint, children }) {
  return (
    <div className="space-y-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div>
        <p className="t-headline">{label}</p>
        {hint && <p className="t-footnote">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// An on or off switch, large enough to hit with a thumb.
function Switch({ label, hint, checked, onChange }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <span className="min-w-0 flex-1">
        <span className="t-headline block">{label}</span>
        {hint && <span className="t-footnote block">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative h-9 w-16 shrink-0 rounded-lg border border-field-line bg-surface-2 transition-colors duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-checked:[&>span]:translate-x-7"
      >
        <span className="absolute left-[3px] top-[3px] size-7 rounded-md bg-surface shadow-md transition-transform duration-200" />
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
  const [firstView, setFirstView] = useFirstView();
  const [rowSize, setRowSize] = useRowSize();
  const [showDone, setShowDone] = useShowDone();
  const [overview, setOverview] = useOverviewParts();
  const toast = useToast();
  const rooms = useApi('/api/rooms?all=1');
  const [saved, setSaved] = useState('');
  const [tabParam, setTab] = useQueryState('tab', 'look');
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'look';
  // On a phone the tabs are one row that scrolls sideways: keep the chosen one in view (Account sits off the edge otherwise).
  const tabStrip = useRef(null);
  useEffect(() => {
    const strip = tabStrip.current;
    const chosen = strip?.querySelector(`#tab-${tab}`);
    if (strip && chosen && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: chosen.offsetLeft - 16 });
  }, [tab]);

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
      <div className="max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="t-display">Settings</h1>
          <p role="status" aria-live="polite" className="min-h-6 text-base font-semibold text-accent-text">{saved}</p>
        </div>

        <div className="mt-2 lg:mt-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div
            ref={tabStrip}
            role="tablist"
            aria-label="Settings"
            className="no-scrollbar sticky top-14 z-20 -mx-4 mb-4 flex gap-1 overflow-x-auto bg-canvas px-4 py-2 lg:top-20 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:px-0 lg:py-0"
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
                  className={`btn shrink-0 justify-start gap-3 px-3 lg:min-h-9 ${on ? 'btn-on' : 'btn-quiet'}`}
                >
                  <Icon size={18} weight={on ? 'fill' : 'bold'} aria-hidden="true" className="shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-8">
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
                Reset All Colours
              </button>
            </Group>

              </>
            )}

            {tab === 'calendar' && (
              <>
                <Group id="calendar" icon={CalendarBlank} title="Calendar" scope="This device only" hint="How the calendar opens and looks on this phone or computer. Other devices keep their own choices.">
                  <Setting label="First view" hint="What the calendar shows when you open it. It always starts on the current month.">
                    <Segmented
                      legend="First view"
                      legendHidden
                      options={[['timeline', 'Timeline'], ['month', 'Month']]}
                      value={firstView}
                      onChange={(v) => { setFirstView(v); setSaved('First view changed on this device'); }}
                    />
                  </Setting>
                  <Setting label="Row size" hint="Roomy keeps every room row at least 40px tall with larger names, so the rooms may need scrolling.">
                    <Segmented
                      legend="Row size"
                      legendHidden
                      options={[['standard', 'Standard'], ['roomy', 'Roomy']]}
                      value={rowSize}
                      onChange={(v) => { setRowSize(v); setSaved('Row size changed on this device'); }}
                    />
                  </Setting>
                  <Switch
                    label="Show checked-out stays"
                    hint="Draw stays that have already checked out. You can also switch this from the calendar toolbar."
                    checked={showDone}
                    onChange={(on) => { setShowDone(on); setSaved(on ? 'Checked-out stays are shown' : 'Checked-out stays are hidden'); }}
                  />
                </Group>

                <Group id="overview" icon={SlidersHorizontal} title="Overview panel" scope="This device only" hint="What the Overview tab on the calendar shows.">
                  {OVERVIEW_PARTS.map(([key, label]) => (
                    <Switch
                      key={key}
                      label={label}
                      checked={overview[key] !== false}
                      onChange={(on) => { setOverview({ ...overview, [key]: on }); setSaved('Overview panel changed on this device'); }}
                    />
                  ))}
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

            {tab === 'rooms' && (
            <Group id="rooms" icon={Bed} title="Rooms" scope="Everyone" hint="Switch a room off to hide it from the calendar. Its bookings are kept.">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {roomList.map((r) => {
                  const tone = roomShade(r, settings);
                  return (
                    <li key={r.id}>
                      <label className="btn cursor-pointer justify-start gap-2 px-3 focus-within:outline-2 focus-within:outline-accent" style={{ borderColor: r.active ? tone.edge : undefined }}>
                        <input type="checkbox" name={`room-${r.number}`} className="size-5 accent-[var(--accent)]" checked={r.active} onChange={(e) => setActive(r, e.target.checked)} />
                        <span aria-hidden="true" className="size-3 shrink-0 rounded-sm border border-black/20" style={{ backgroundColor: tone.fill }} />
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
