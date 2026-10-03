import Sheet from '../Sheet';
import GuestForm from './GuestForm';
import { useToast } from '../Toast';
import { useApi } from '../../lib/useApi';

// Loads a guest (id) or starts a new one (id === 'new') and shows the form in a sheet.
export default function GuestSheet({ id, onClose, onChanged }) {
  const toast = useToast();
  const isNew = id === 'new';
  const detail = useApi(isNew ? null : `/api/guests/${id}`);
  const rooms = useApi('/api/rooms');
  const guest = detail.data;

  if (!isNew && !guest) {
    return (
      <Sheet title="Guest" onClose={onClose}>
        <p className="text-muted">{detail.error ? detail.error.message : 'Loading…'}</p>
      </Sheet>
    );
  }
  return (
    <GuestForm
      key={id}
      isNew={isNew}
      guest={guest}
      rooms={rooms.data ?? []}
      onClose={onClose}
      onChanged={() => { onChanged(); detail.reload(); }}
      toast={toast}
    />
  );
}
