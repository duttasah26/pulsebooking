import { ArrowUUpLeft, ArrowUUpRight, CalendarBlank, Check, Clock, Cursor, PencilSimple, Trash, X } from '@phosphor-icons/react';

// In the instructions, a button or tool is shown as it looks on screen: its own symbol with its name, on the same tinted
// fill as the button, so it can be found by shape and not only by reading.
export const TONES = {
  ink: 'bg-tint text-ink',
  amber: 'border-dashed border-hold-edge bg-hold text-hold-ink',
  sky: 'bg-tint text-ink',
  green: 'bg-accent text-accent-ink',
  red: 'bg-danger-soft text-danger',
};

export function Pill({ icon: Icon, tone = 'ink', children }) {
  return (
    <span className={`mx-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-transparent px-1.5 py-px align-middle text-[0.95em] font-semibold leading-snug ${TONES[tone]}`}>
      <Icon size={16} aria-hidden="true" />
      {children}
    </span>
  );
}

// The two tools on the left, and the buttons the instructions name.
export const MousePill = () => <Pill icon={Cursor}>Select</Pill>;
export const PencilPill = () => <Pill icon={Clock} tone="amber">On Hold</Pill>;
export const UndoPill = () => <Pill icon={ArrowUUpLeft}>Undo</Pill>;
export const RedoPill = () => <Pill icon={ArrowUUpRight}>Redo</Pill>;
export const SavePill = () => <Pill icon={Check} tone="green">Save</Pill>;
export const ConfirmPill = () => <Pill icon={Check} tone="green">Confirm</Pill>;
export const EditPill = () => <Pill icon={PencilSimple}>Edit</Pill>;
export const DeletePill = () => <Pill icon={Trash} tone="red">Hold to Delete</Pill>;
export const XPill = () => <Pill icon={X} tone="red">X</Pill>;
export const GoToPill = () => <Pill icon={CalendarBlank}>Go to</Pill>;
