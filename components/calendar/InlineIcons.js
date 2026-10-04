import { ArrowUUpLeft, ArrowUUpRight, CalendarBlank, Check, Cursor, PencilSimple, PencilSimpleLine, Trash, X } from '@phosphor-icons/react';

// In the instructions, a button or tool is shown as it looks on screen: its own icon with its name, in a small outlined
// pill, so it can be found by shape and colour and not only by reading. Same icons and colours as the buttons.
export const TONES = {
  ink: 'border-ink/30 bg-surface-2 text-ink',
  amber: 'border-amber-400 bg-amber-100 text-amber-700',
  sky: 'border-sky-400 bg-sky-100 text-sky-700',
  green: 'border-accent bg-accent-soft text-accent-text',
  red: 'border-danger bg-red-50 text-danger',
};

export function Pill({ icon: Icon, tone = 'ink', children }) {
  return (
    <span className={`mx-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded-md border-2 px-1.5 py-px align-middle text-[0.95em] font-semibold leading-snug ${TONES[tone]}`}>
      <Icon size={16} weight="bold" aria-hidden="true" />
      {children}
    </span>
  );
}

// The two tools on the left, and the buttons the instructions name.
export const MousePill = () => <Pill icon={Cursor}>Select</Pill>;
export const PencilPill = () => <Pill icon={PencilSimpleLine} tone="amber">On Hold</Pill>;
export const UndoPill = () => <Pill icon={ArrowUUpLeft}>Undo</Pill>;
export const RedoPill = () => <Pill icon={ArrowUUpRight}>Redo</Pill>;
export const SavePill = () => <Pill icon={Check} tone="green">Save</Pill>;
export const ConfirmPill = () => <Pill icon={Check} tone="green">Confirm</Pill>;
export const EditPill = () => <Pill icon={PencilSimple}>Edit</Pill>;
export const DeletePill = () => <Pill icon={Trash} tone="red">Hold to Delete</Pill>;
export const XPill = () => <Pill icon={X} tone="red">X</Pill>;
export const GoToPill = () => <Pill icon={CalendarBlank}>Go to</Pill>;
