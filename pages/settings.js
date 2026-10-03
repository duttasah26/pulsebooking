import { useState } from 'react';
import { Bed, Clock, Palette, Plus, SignIn, SignOut } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import FieldLabel from '../components/FieldLabel';
import TimeSelect from '../components/TimeSelect';
import ColorPicker from '../components/booking/ColorPicker';
import { useSettings } from '../components/SettingsProvider';
import { useToast } from '../components/Toast';
import { floorLabel, floorOf } from '../components/calendar/floors';
import { floorColor, statusColor } from '../lib/colors';
import { api, useApi } from '../lib/useApi';

const STATUSES = [
  { key: 'confirmed', label: 'Confirmed Bookings' },
  { key: 'on_hold', label: 'On-hold Bookings' },
];

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="space-y-4 rounded-lg border border-line bg-surface p-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Icon size={18} aria-hidden="true" /> {title}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// Settings are shared by everyone using the app: a change shows at once and is saved for every device.
export default function Settings() {
  const { settings, save } = useSettings();
  const toast = useToast();
  const rooms = useApi('/api/rooms?all=1');
  const [number, setNumber] = useState('');
  const [adding, setAdding] = useState(false);

  const apply = async (change) => {
    try {
      await save(change);
    } catch (err) {
      toast({ message: `Could not save: ${err.message}` });
    }
  };

  const roomList = rooms.data ?? [];
  const floors = [...new Set(['1', '2', '3', ...roomList.map(floorOf)])].sort();

  const addRoom = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const room = await api('/api/rooms', { method: 'POST', body: { number: number.trim() } });
      toast({ message: `Room ${room.number} added`, duration: 3000 });
      setNumber('');
      rooms.reload();
    } catch (err) {
      toast({ message: err.message });
    }
    setAdding(false);
  };

  const setActive = async (room, active) => {
    try {
      await api(`/api/rooms/${room.id}`, { method: 'PATCH', body: { active } });
      rooms.reload();
    } catch (err) {
      toast({ message: err.message });
    }
  };

  return (
    <Layout title="Settings">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold">Settings</h1>

        <Section icon={Palette} title="Floor Colours" hint="Each floor's room boxes on the calendar share one colour. The first digit of a room number is its floor.">
          <div className="space-y-5">
            {floors.map((f) => {
              const tone = floorColor({ number: f }, settings);
              return (
                <div key={f} className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                  <div>
                    <span
                      className="inline-flex min-h-8 min-w-20 items-center justify-center rounded-lg border px-3 font-mono text-xs font-semibold"
                      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
                    >
                      {f}01
                    </span>
                  </div>
                  <ColorPicker
                    id={`floor-${f}`}
                    label={floorLabel(f)}
                    autoLabel="Default"
                    hint={null}
                    color={settings.floorColors[f] ?? null}
                    onChange={(color) => apply({ floorColors: { [f]: color } })}
                  />
                </div>
              );
            })}
          </div>
        </Section>

        <Section icon={Palette} title="Booking Colours" hint="Used for bookings that have no colour of their own and whose guest has none.">
          <div className="space-y-5">
            {STATUSES.map(({ key, label }) => {
              const tone = statusColor(key, settings);
              return (
                <div key={key} className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                  <div>
                    <span
                      className={`inline-flex min-h-8 min-w-20 items-center justify-center rounded-lg border px-3 text-xs font-medium ${key === 'on_hold' ? 'border-dashed' : ''}`}
                      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
                    >
                      {key === 'on_hold' ? 'On hold' : 'Confirmed'}
                    </span>
                  </div>
                  <ColorPicker
                    id={`status-${key}`}
                    label={label}
                    autoLabel="Default"
                    hint={null}
                    color={settings.statusColors[key] ?? null}
                    onChange={(color) => apply({ statusColors: { [key]: color } })}
                  />
                </div>
              );
            })}
          </div>
        </Section>

        <Section icon={Clock} title="Default Times" hint="Filled in on every new booking. Each booking can still change them.">
          <div className="grid grid-cols-2 gap-3">
            <TimeSelect id="s-in-time" icon={SignIn} label="Check-in time" value={settings.checkInTime} onChange={(v) => apply({ checkInTime: v })} />
            <TimeSelect id="s-out-time" icon={SignOut} label="Check-out time" value={settings.checkOutTime} onChange={(v) => apply({ checkOutTime: v })} />
          </div>
        </Section>

        <Section icon={Bed} title="Rooms" hint="Switch a room off to hide it from the calendar. Its past bookings are kept.">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {roomList.map((r) => {
              const tone = floorColor(r, settings);
              return (
                <li key={r.id}>
                  <label className="btn cursor-pointer justify-start gap-2 px-2.5 focus-within:outline-2 focus-within:outline-accent">
                    <input
                      type="checkbox"
                      name={`room-${r.number}`}
                      className="size-4 accent-[var(--accent)]"
                      checked={r.active}
                      onChange={(e) => setActive(r, e.target.checked)}
                    />
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: tone.border }} />
                    <span className={`font-mono ${r.active ? '' : 'text-muted line-through'}`}>{r.number}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <form onSubmit={addRoom} className="flex items-end gap-2">
            <div className="w-40">
              <FieldLabel icon={Plus} htmlFor="new-room">New Room Number</FieldLabel>
              <input
                id="new-room"
                name="room-number"
                inputMode="numeric"
                className="field font-mono"
                placeholder="107…"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding || !number.trim()}>
              <Plus size={18} aria-hidden="true" /> Add Room
            </button>
          </form>
        </Section>
      </div>
    </Layout>
  );
}
