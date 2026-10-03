// A form label with a small leading icon. Use as="legend" or as="span" for groups of controls.
export default function FieldLabel({ icon: Icon, as: Tag = 'label', children, hidden = false, ...rest }) {
  return (
    <Tag className={hidden ? 'sr-only' : 'label flex items-center gap-1.5'} {...rest}>
      {Icon && <Icon size={14} aria-hidden="true" className="shrink-0 text-muted" />}
      {children}
    </Tag>
  );
}
