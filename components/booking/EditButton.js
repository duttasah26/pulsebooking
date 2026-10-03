import { PencilSimple } from '@phosphor-icons/react';

// Turns a booking's details (or the selection) into a form. A plain button: the pencil icon and the word Edit.
export default function EditButton({ onClick, disabled, label = 'Edit booking' }) {
  return (
    <button type="button" className="btn gap-1.5 px-3" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <PencilSimple size={16} aria-hidden="true" /> Edit
    </button>
  );
}
