import { PencilSimple } from '@phosphor-icons/react';

// The pencil that turns a booking's details into the form.
export default function EditButton({ onClick, disabled }) {
  return (
    <button type="button" className="btn btn-icon border-amber-300 bg-amber-50 hover:bg-amber-100" aria-label="Edit booking" title="Edit" onClick={onClick} disabled={disabled}>
      <PencilSimple size={18} weight="fill" aria-hidden="true" className="text-amber-600" />
    </button>
  );
}
