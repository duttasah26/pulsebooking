// A form label: plain words, semibold, above its field. `icon` is accepted and ignored: the label says what the field is.
// Use as="legend" or as="span" for groups of controls.
// eslint-disable-next-line no-unused-vars
export default function FieldLabel({ icon, as: Tag = 'label', children, hidden = false, ...rest }) {
  return (
    <Tag className={hidden ? 'sr-only' : 'label'} {...rest}>
      {children}
    </Tag>
  );
}
