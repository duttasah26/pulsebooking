import {
  ArrowsHorizontal, CalendarBlank, ChatCircleDots, Check, Clock, Cursor, MagnifyingGlassPlus, PencilSimpleLine, Plus, Trash, X, ArrowUUpLeft,
} from '@phosphor-icons/react';
import Sheet from '../Sheet';
import {
  ConfirmPill, DeletePill, EditPill, GoToPill, MousePill, PencilPill, RedoPill, SavePill, TONES, UndoPill, XPill,
} from './InlineIcons';

// A step-by-step guide to the calendar, written for someone using it for the first time: short plain sentences, large
// text, and on every step the same icon as the button or tool it talks about (the big icon at the left, and the small
// pills inside the sentence).
function Step({ icon: Icon, tone = 'ink', title, children }) {
  return (
    <li className="flex gap-3">
      <span className={`grid size-11 shrink-0 place-items-center rounded-lg border-2 ${TONES[tone]}`}>
        <Icon size={24} weight="bold" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold leading-snug">{title}</p>
        <p className="mt-0.5 text-base leading-relaxed text-ink/80">{children}</p>
      </div>
    </li>
  );
}

function Group({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="border-b border-line pb-1 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="space-y-4">{children}</ul>
    </section>
  );
}

export default function HelpGuide({ onClose }) {
  return (
    <Sheet title="How to use the calendar" onClose={onClose}>
      <div className="space-y-6 pb-6">
        <p className="text-base leading-relaxed">
          Each <strong>row</strong> is a room. Each <strong>column</strong> is a day. A coloured <strong>bar</strong> is a booking.
          The two tools are in the column on the left: <MousePill /> <PencilPill />.
        </p>

        <Group title="Booking a room">
          <Step icon={PencilSimpleLine} tone="amber" title="To book a room, choose Hold">
            Press the <PencilPill /> on the left. Then press on an empty day and drag across the days the guest will stay. A yellow bar appears. This is a <strong>hold</strong>: the room is kept, but it has no name yet.
          </Step>
          <Step icon={Check} tone="green" title="Turn the hold into a real booking">
            Choose <MousePill />, click the yellow bar, and press <ConfirmPill /> on the right.
          </Step>
          <Step icon={X} tone="red" title="Cancel a hold">
            Press the small <XPill /> on the yellow bar. If it was a mistake, press <UndoPill />.
          </Step>
          <Step icon={Plus} tone="green" title="Fill in a booking with the guest's name">
            Use the <strong>New Booking</strong> panel on the right. It has three steps: 1 the guest, 2 the dates and rooms, 3 check everything and press <ConfirmPill />.
          </Step>
        </Group>

        <Group title="Looking">
          <Step icon={Cursor} title="See a booking">
            Choose <MousePill />. Click a coloured bar. Its details open on the right.
          </Step>
          <Step icon={Cursor} title="Pick several bookings">
            With the <MousePill />, press on an empty spot and drag a box over the bars. Everything the box touches is picked. You can also hold the <strong>Ctrl</strong> key and click each booking. On a phone, press and hold a booking for a moment.
          </Step>
          <Step icon={X} tone="red" title="Unpick a booking">
            Once something is picked, click a picked booking again to let it go. Click an empty spot, press <strong>Esc</strong>, or press <strong>Unselect All</strong> to let go of everything.
          </Step>
          <Step icon={CalendarBlank} title="Go to another date">
            Press <GoToPill /> at the top. Choose the first day, then the last day, then press <strong>Show</strong>. <strong>Today</strong> brings you back.
          </Step>
          <Step icon={MagnifyingGlassPlus} title="Make things bigger or smaller">
            Use the <strong>+</strong> and <strong>-</strong> magnifying glasses under the calendar.
          </Step>
        </Group>

        <Group title="Changing a booking">
          <Step icon={PencilSimpleLine} tone="amber" title="Move a booking to other days or another room">
            Choose the <PencilPill />. Press on the booking and drag it. Then press <SavePill /> in the yellow box on the right.
          </Step>
          <Step icon={ArrowsHorizontal} tone="amber" title="Make a stay longer or shorter">
            Choose the <PencilPill />. Drag the small <strong>white tab</strong> at the end of the bar. Then press <SavePill />. Nothing changes until you press Save.
          </Step>
          <Step icon={PencilSimpleLine} title="Change names or details">
            Click the booking, then press <EditPill /> on the right. If you picked several bookings, <EditPill /> lets you type their names.
          </Step>
          <Step icon={Trash} tone="red" title="Delete a booking">
            Click the booking. Press and <strong>keep holding</strong> <DeletePill /> until it fills up. A quick tap does nothing, so it cannot happen by accident.
          </Step>
        </Group>

        <Group title="Made a mistake?">
          <Step icon={ArrowUUpLeft} title="Undo">
            Press <UndoPill /> on the left, or press the <strong>Ctrl</strong> and <strong>Z</strong> keys together. <RedoPill /> goes forward again.
          </Step>
        </Group>

        <Group title="Other help">
          <Step icon={Clock} title="What does a yellow dashed bar mean?">
            It is a <strong>hold</strong>: a room kept for someone, not confirmed yet. A green bar is a confirmed booking.
          </Step>
          <Step icon={ChatCircleDots} tone="green" title="Ask the assistant">
            Press the round green button at the bottom right. Ask, for example, "Which rooms are free this weekend?" It only looks things up. It cannot change anything.
          </Step>
        </Group>
      </div>
    </Sheet>
  );
}
