import { useState } from 'react';
import { Buildings, Users } from '@phosphor-icons/react';
import { Row } from '../Motion';
import SearchBox from '../SearchBox';
import Sheet from '../Sheet';
import ColorPicker from '../booking/ColorPicker';
import { useToast } from '../Toast';
import { api, useApi } from '../../lib/useApi';
import { resolveColor } from '../../lib/colors';

// The Companies tab of Guests: every organization typed on a guest or a booking, with how many guests and stays it has and its
// preset colour. A company's colour is given to its guests, so their bookings show it on the calendar; a new booking for the company
// starts with it too.
export default function CompanyList({ onSearchGuests }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // company name
  const list = useApi(`/api/companies?q=${encodeURIComponent(q)}`);
  const companies = list.data ?? [];
  const company = companies.find((c) => c.name === open);

  const setColor = async (color) => {
    try {
      await api('/api/companies', { method: 'PATCH', body: { name: open, color } });
      list.reload();
    } catch (err) {
      toast({ message: `Could not save the colour: ${err.message}`, important: true });
    }
  };

  return (
    <div className="space-y-4">
      <SearchBox value={q} onChange={setQ} label="Search companies" placeholder="Search companies…" />
      {list.error && <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-base text-danger">Could not load companies: {list.error.message}</p>}
      {!list.data && !list.error ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
      ) : companies.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-6 py-12 text-center text-base text-muted">
          {q ? 'No company matches this search.' : 'No companies yet. A company appears here once you type one on a guest or a booking.'}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {companies.map((c, i) => {
            const tone = resolveColor(c.color);
            return (
              <Row key={c.name} index={i}>
                <button type="button" onClick={() => setOpen(c.name)} className="flex min-h-[4.5rem] w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-2 md:px-5">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md border" style={tone ? { backgroundColor: tone.bg, borderColor: tone.border } : undefined}>
                    <Buildings size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[1.0625rem] font-semibold">{c.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[0.9375rem] text-muted">
                      <Users size={14} aria-hidden="true" /> {c.guests} {c.guests === 1 ? 'guest' : 'guests'}, {c.stays} {c.stays === 1 ? 'booking' : 'bookings'}
                    </span>
                  </span>
                </button>
              </Row>
            );
          })}
        </ul>
      )}
      {company && (
        <Sheet title={company.name} onClose={() => setOpen(null)}>
          <div className="space-y-5">
            <p className="text-base text-muted">{company.guests} {company.guests === 1 ? 'guest' : 'guests'}, {company.stays} {company.stays === 1 ? 'booking' : 'bookings'}</p>
            <ColorPicker
              id="company-color"
              label="Preset colour"
              autoLabel="None"
              color={company.color}
              onChange={setColor}
            />
            <button type="button" className="btn btn-block" onClick={() => { onSearchGuests(company.name); setOpen(null); }}>
              Show Its Guests
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
