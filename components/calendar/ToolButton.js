// One tool button. `tone` is the colour of its icon (and of its fill while it is on). `vertical` stacks the label under
// the icon, for the tool pane on the right edge; otherwise the label sits beside it (iconOnly hides it, for Undo and Redo).
// Each tool has its own colour (icon always, fill while it is on), so a tool is found by colour as well as by shape:
// New green, On Hold amber, Open ink, Select violet, Hand sky.
const TONES = {
  amber: { icon: 'text-amber-600', on: 'border-amber-400 bg-amber-100' },
  sky: { icon: 'text-sky-600', on: 'border-sky-400 bg-sky-100' },
  violet: { icon: 'text-violet-600', on: 'border-violet-400 bg-violet-100' },
  plain: { icon: 'text-ink', on: '' },
  green: { icon: 'text-accent-text', on: 'border-accent bg-accent-soft' },
  ink: { icon: 'text-ink', on: 'border-ink bg-surface-2' },
};

export default function ToolButton({ icon: Icon, label, title, on, onClick, disabled, tone = 'plain', vertical = false, iconOnly = false }) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${
        vertical ? 'h-auto min-h-12 w-full flex-col gap-0.5 px-1 py-1.5 lg:min-h-12' : 'min-h-11 gap-1.5 px-3 text-sm lg:min-h-7 lg:px-2.5'
      } ${on ? t.on : 'border-transparent'}`}
    >
      <Icon size={vertical ? 20 : 18} weight={on ? 'fill' : 'regular'} className={`shrink-0 ${t.icon}`} />
      <span className={vertical ? 'text-xs font-medium leading-none' : iconOnly ? 'sr-only' : ''}>{label}</span>
    </button>
  );
}
