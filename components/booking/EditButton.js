
// Turns a booking's details (or the selection) into a form. A plain button: the pencil icon and the word Edit.
export default function EditButton({ onClick, disabled, label = 'Edit booking' }) {
  return (
    <button type="button" className="btn btn-sm" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      Edit
    </button>
  );
}
