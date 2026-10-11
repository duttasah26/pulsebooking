// One tool button. Tools are monochrome: an ink symbol with its name, and while a tool is on it fills solid ink with white
// words, so the one that is on is never in doubt. Two tools borrow a colour because the colour is what they make:
// New (green, a booking) and On Hold (amber, a hold). `tone` picks which; anything else is ink.
// `vertical` stacks the label under the symbol, for the tool column; otherwise it sits beside it (iconOnly hides it).
const ON = {
  green: 'bg-accent text-accent-ink hover:bg-accent-strong active:bg-accent-strong',
  amber: 'border-hold-edge bg-hold text-hold-ink hover:bg-hold active:bg-hold',
  ink: 'bg-ink text-white hover:bg-ink active:bg-ink',
};

export default function ToolButton({ icon: Icon, label, title, on, onClick, disabled, tone = 'ink', vertical = false, iconOnly = false }) {
  const filled = on ? ON[tone] ?? ON.ink : 'btn-quiet text-ink';
  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${
        vertical ? 'h-auto min-h-14 w-full flex-col gap-1 px-1 py-2 lg:min-h-14 lg:px-1' : (iconOnly ? 'btn-icon' : 'px-3')
      } ${filled}`}
    >
      <Icon size={vertical ? 22 : 20} weight={on ? 'fill' : 'bold'} />
      <span className={vertical ? 'text-[0.8125rem] font-semibold leading-none' : iconOnly ? 'sr-only' : 'text-[0.9375rem]'}>{label}</span>
    </button>
  );
}
