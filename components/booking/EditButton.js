import { PencilSimple } from '@phosphor-icons/react';

// The pencil that turns a booking's details into the form.
export default function EditButton({ onClick, disabled }) {
  return (
    <button type="button" className="btn btn-icon" aria-label="Edit booking" title="Edit" onClick={onClick} disabled={disabled}>
      <PencilSimple size={18} aria-hidden="true" />
    </button>
  );
}
