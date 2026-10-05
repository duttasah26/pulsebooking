import {
  ArrowUUpLeft, CalendarBlank, CaretDown, ChatCircleDots, CheckSquare, Clock, Cursor, Hand, MagnifyingGlassPlus, PencilSimpleLine, Plus, SignIn, Trash,
} from '@phosphor-icons/react';
import Sheet from '../Sheet';
import { useSettings } from '../SettingsProvider';
import { colorFor, roomShade } from '../../lib/colors';
import {
  ConfirmPill, DeletePill, EditPill, GoToPill, MousePill, PencilPill, RedoPill, SavePill, UndoPill, XPill,
} from './InlineIcons';

// A guide to the calendar for someone using it for the first time. It goes from the picture to the details: first what
// the screen is (a small drawn calendar), then what the bars mean (the real bar colours), then the tools (the same icons
// and colours as the buttons), then short numbered recipes that open one at a time. Large text, one idea per line.

const HOLD_HATCH = 'repeating-linear-gradient(135deg, transparent 0 5px, rgb(255 255 255 / 0.55) 5px 7px)';

// A drawn miniature of the calendar, with the three things to know called out in colour.
function MiniCalendar() {
  const { settings } = useSettings();
  const rooms = ['101', '102', '201'];
  const days = [12, 13, 14, 15, 16, 17];
  const stay = colorFor({ status: 'confirmed' }, settings);
  const hold = colorFor({ status: 'on_hold' }, settings);
  return (
    <figure className="space-y-5">
      <div className="grid grid-cols-[3.25rem_repeat(6,minmax(0,1fr))] gap-1.5 rounded-lg border border-line bg-surface-2 p-3" aria-hidden="true">
        <span style={{ gridRow: 1, gridColumn: 1 }} />
        {days.map((d, i) => (
          <span key={d} style={{ gridRow: 1, gridColumn: i + 2 }} className="rounded-md bg-white py-1 text-center font-mono text-sm font-semibold ring-2 ring-sky-300">{d}</span>
        ))}
        {rooms.map((n, r) => {
          const shade = roomShade({ number: n }, settings);
          return (
            <span key={n} style={{ gridRow: r + 2, gridColumn: 1, backgroundColor: shade.fill, boxShadow: `inset 0 0 0 2px ${shade.edge}` }} className="grid place-items-center rounded-md font-mono text-sm font-semibold">{n}</span>
          );
        })}
        {rooms.map((n, r) => days.map((d, i) => (
          <span key={`${n}-${d}`} style={{ gridRow: r + 2, gridColumn: i + 2 }} className="h-8 rounded-md bg-white" />
        )))}
        <span style={{ gridRow: 2, gridColumn: '3 / span 3', backgroundColor: stay.bg, borderColor: stay.border }} className="z-[1] flex h-8 items-center rounded-lg border px-2 text-sm font-semibold ring-2 ring-accent">Ana</span>
        <span style={{ gridRow: 3, gridColumn: '2 / span 2', backgroundColor: hold.bg, borderColor: hold.border, backgroundImage: HOLD_HATCH }} className="z-[1] flex h-8 items-center gap-1 rounded-lg border border-dashed px-2 text-sm font-semibold"><Clock size={14} aria-hidden="true" /> Hold</span>
      </div>
      <figcaption className="grid gap-3 text-base sm:grid-cols-3">
        <p className="flex items-center gap-2"><span className="size-4 shrink-0 rounded bg-white ring-2 ring-sky-300" aria-hidden="true" /> A <strong>column</strong> is a day</p>
        <p className="flex items-center gap-2"><span className="size-4 shrink-0 rounded bg-surface-2 ring-2 ring-line" aria-hidden="true" /> A <strong>row</strong> is a room</p>
        <p className="flex items-center gap-2"><span className="size-4 shrink-0 rounded ring-2 ring-accent" style={{ backgroundColor: stay.bg }} aria-hidden="true" /> A <strong>bar</strong> is a booking</p>
      </figcaption>
    </figure>
  );
}

// The four kinds of bar, drawn in the colours the calendar really uses.
function BarKey() {
  const { settings } = useSettings();
  const kinds = [
    { status: 'confirmed', name: 'Confirmed', says: 'A real booking' },
    { status: 'on_hold', name: 'On hold', says: 'Room kept, not confirmed yet' },
    { status: 'checked_in', name: 'Checked in', says: 'The guest is here', icon: SignIn },
    { status: 'checked_out', name: 'Checked out', says: 'Finished, shown faded' },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {kinds.map(({ status, name, says, icon: Icon }) => {
        const c = colorFor({ status }, settings);
        const hold = status === 'on_hold';
        return (
          <li key={status} className="flex items-center gap-4 rounded-lg border border-line bg-surface p-3">
            <span
              className={`flex h-9 w-24 shrink-0 items-center gap-1 rounded-lg border px-2 text-sm font-semibold ${hold ? 'border-dashed' : ''} ${status === 'checked_out' ? 'opacity-60' : ''}`}
              style={{ backgroundColor: c.bg, borderColor: c.border, ...(hold ? { backgroundImage: HOLD_HATCH } : {}) }}
              aria-hidden="true"
            >
              {hold && <Clock size={14} />}
              {Icon && <Icon size={14} weight="bold" />}
              Ana
            </span>
            <span className="min-w-0 leading-snug"><strong className="block font-semibold">{name}</strong><span className="text-ink/80">{says}</span></span>
          </li>
        );
      })}
    </ul>
  );
}

// The tools, as drawn on the buttons: the same icon and the colour it turns when it is on.
const TOOLS = [
  { icon: Plus, name: 'New', says: 'Draw the nights of a new booking with a guest', tone: 'text-accent-text', on: 'border-accent bg-accent-soft' },
  { icon: PencilSimpleLine, name: 'On Hold', says: 'Drag over free nights to keep a room', tone: 'text-amber-600', on: 'border-amber-400 bg-amber-100' },
  { icon: Cursor, name: 'Open', says: 'Tap a bar to see the booking', tone: 'text-ink', on: 'border-ink bg-surface-2' },
  { icon: CheckSquare, name: 'Select', says: 'Pick several bookings at once', tone: 'text-violet-600', on: 'border-violet-400 bg-violet-100' },
  { icon: Hand, name: 'Hand', says: 'Drag the calendar to move around', tone: 'text-sky-600', on: 'border-sky-400 bg-sky-100' },
  { icon: ArrowUUpLeft, name: 'Undo', says: 'Take back the last change', tone: 'text-ink', on: 'border-line bg-surface-2' },
];

function ToolKey() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {TOOLS.map(({ icon: Icon, name, says, tone, on }) => (
        <li key={name} className="flex items-center gap-4 rounded-lg border border-line bg-surface p-3">
          <span className={`grid size-12 shrink-0 place-items-center rounded-lg border-2 ${on}`} aria-hidden="true">
            <Icon size={24} weight="fill" className={tone} />
          </span>
          <span className="min-w-0 leading-snug"><strong className="block font-semibold">{name}</strong><span className="text-ink/80">{says}</span></span>
        </li>
      ))}
    </ul>
  );
}

// A recipe: a question that opens to numbered steps.
function Recipe({ icon: Icon, title, steps, note, open = false }) {
  return (
    <details open={open} name="recipe" className="group rounded-lg border border-line bg-surface">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2"><Icon size={22} weight="bold" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1 text-base font-semibold leading-snug">{title}</span>
        <CaretDown size={20} aria-hidden="true" className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-line px-4 py-4">
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-sm font-semibold text-canvas" aria-hidden="true">{i + 1}</span>
              <p className="min-w-0 pt-0.5 text-base leading-loose"><span className="sr-only">Step {i + 1}: </span>{step}</p>
            </li>
          ))}
        </ol>
        {note && <p className="rounded-lg bg-surface-2 px-4 py-3 text-base leading-relaxed text-ink/80">{note}</p>}
      </div>
    </details>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-line pb-2 text-xl font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export default function HelpGuide({ onClose }) {
  return (
    <Sheet title="How to use the calendar" onClose={onClose} wide>
      <div className="space-y-12 pb-10">
        <Section title="What you are looking at">
          <MiniCalendar />
        </Section>

        <Section title="What the bars mean">
          <BarKey />
        </Section>

        <Section title="Your tools">
          <ToolKey />
        </Section>

        <Section title="How do I...">
          <div className="space-y-3">
            <Recipe
              open
              icon={PencilSimpleLine}
              title="Keep a room for someone"
              steps={[
                <>Press <PencilPill /> in the tools.</>,
                <>Press the first night, then the last night. On a computer you can drag across the nights.</>,
                <>A yellow bar appears. That is a <strong>hold</strong>: the room is kept, with no name yet.</>,
              ]}
              note={<>Made a mistake? Press the small <XPill /> on the bar, or <UndoPill />.</>}
            />
            <Recipe
              icon={Plus}
              title="Make it a real booking"
              steps={[
                <>Press <MousePill /> and press the yellow bar.</>,
                <>Press <ConfirmPill /> on the right. Add the guest's name if it asks.</>,
              ]}
            />
            <Recipe
              icon={Plus}
              title="Add a booking with a guest name"
              steps={[
                <>Press <strong>New</strong> in the tools.</>,
                <>Draw the nights on the calendar, or type the dates in the form.</>,
                <>Check the details and press <ConfirmPill />.</>,
              ]}
            />
            <Recipe
              icon={Cursor}
              title="See or change a booking"
              steps={[
                <>Press <MousePill />, then press the coloured bar.</>,
                <>The details open. Press <EditPill /> to change names, dates or rooms.</>,
              ]}
            />
            <Recipe
              icon={PencilSimpleLine}
              title="Move a stay, or make it longer or shorter"
              steps={[
                <>Press <strong>Select</strong> in the tools, then press the booking to pick it. (A hold can also be changed with <PencilPill />.)</>,
                <>Drag the bar to other days or another room. To change the length, drag the small white tab at the end of the bar.</>,
                <>Press <SavePill /> in the yellow box. It shows the old and new dates. Nothing changes until you press Save.</>,
              ]}
              note="Would rather not drag? Press the booking, press Edit, and type the new dates. On a keyboard, pick the booking, then press Alt with the left or right arrow to move it, Alt and Shift to change check-out, Alt and Ctrl to change check-in."
            />
            <Recipe
              icon={CheckSquare}
              title="Pick several bookings"
              steps={[
                <>Press <strong>Select</strong> in the tools.</>,
                <>Press each booking to pick it. Press it again to let it go.</>,
                <>Use the strip under the calendar to view or delete them. <strong>Unselect All</strong> lets go of everything.</>,
              ]}
              note="On a computer you can also drag a box over the bars, or hold Ctrl and click."
            />
            <Recipe
              icon={Trash}
              title="Delete a booking"
              steps={[
                <>Press the booking to open it.</>,
                <>Press and <strong>keep holding</strong> <DeletePill /> until it fills. A quick tap does nothing, so it cannot happen by accident.</>,
              ]}
              note="Deleted by mistake? Press Undo straight away."
            />
            <Recipe
              icon={ArrowUUpLeft}
              title="Take back a mistake"
              steps={[
                <>Press <UndoPill /> in the tools, or press Ctrl and Z together.</>,
                <><RedoPill /> goes forward again.</>,
              ]}
            />
            <Recipe
              icon={CalendarBlank}
              title="Go to another date, or zoom"
              steps={[
                <>Press <GoToPill /> at the top, choose the first and last day, then press <strong>Show</strong>. <strong>Today</strong> brings you back.</>,
                <>Use the <MagnifyingGlassPlus size={18} className="inline align-text-bottom" aria-hidden="true" /> and minus buttons at the top, beside the month, to make things bigger or smaller. The percentage takes you back to 100.</>,
              ]}
              note="On the Day and Occupancy tabs, press and hold an arrow or a day to keep moving."
            />
            <Recipe
              icon={ChatCircleDots}
              title="Ask the assistant"
              steps={[
                <>Press the round green button at the bottom right.</>,
                <>Ask, for example, "Which rooms are free this weekend?"</>,
              ]}
              note="It only looks things up. It cannot change anything."
            />
          </div>
        </Section>
      </div>
    </Sheet>
  );
}
