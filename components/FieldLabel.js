// A form label: plain, dark and large, with a small grey icon in front that says what kind of field it is. Use as="legend" or
// as="span" for groups of controls.
export default function FieldLabel({ icon: Icon, as: Tag = 'label', children, hidden = false, ...rest }) {
  return (
    <Tag className={hidden ? 'sr-only' : 'label flex items-center gap-1.5'} {...rest}>
      {Icon && <Icon size={16} aria-hidden="true" className="shrink-0 text-muted" />}
      {children}
    </Tag>
  );
}
