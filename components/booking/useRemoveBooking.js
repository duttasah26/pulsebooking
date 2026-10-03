import { useState } from 'react';
import { useToast } from '../Toast';
import { api } from '../../lib/useApi';

// Deleting the booking you are looking at (or all rooms of a hold). If the page passes onRemove it takes over:
// the booking disappears at once and the server is told in the background (with Undo). Otherwise this deletes
// it here and offers Undo for a normal booking (a hold is removed for good, so it cannot be restored).
export function useRemoveBooking({ booking, targets, onRemove, onSaved, onDone }) {
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const remove = async () => {
    if (onRemove) {
      onRemove(targets);
      onDone();
      return;
    }
    setRemoving(true);
    try {
      await Promise.all(targets.map((t) => api(`/api/bookings/${t.id}`, { method: 'DELETE' })));
      onSaved();
      onDone();
      if (booking.status === 'on_hold') return toast({ message: targets.length > 1 ? 'Holds removed' : 'Hold removed', duration: 3000 });
      toast({
        message: 'Booking deleted',
        actionLabel: 'Undo',
        onAction: async () => {
          try {
            await api(`/api/bookings/${booking.id}/restore`, { method: 'POST' });
            onSaved('Booking restored');
          } catch (err) {
            toast({ message: `Could not restore: ${err.message}` });
          }
        },
      });
    } catch (err) {
      setRemoveError(err.message);
      setRemoving(false);
    }
  };

  return { remove, removing, removeError };
}
