import BookingWizard from './BookingWizard';
import EditBooking from './EditBooking';

// A new booking is the three-step wizard (BookingWizard); an existing booking or hold opens the edit form (EditBooking).
// Props: see useBookingForm, plus rooms (all rooms) and onCancel.
export default function BookingForm(props) {
  return props.mode === 'edit' ? <EditBooking {...props} /> : <BookingWizard {...props} />;
}
