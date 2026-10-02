import React, { useState, useEffect } from 'react';

const BookingForm = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState({
    room_number: '',
    name: '',
    channel: '',
    guests: 1,
    nights: 1,
    rate_type: '',
    check_in: '',
    check_out: ''
  });

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        nights: calculateNights(initialData.check_in, initialData.check_out)
      }));
    }
  }, [initialData]);

  // Calculate nights between dates
  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Recalculate nights if dates change
    if (name === 'check_in' || name === 'check_out') {
      setFormData(prev => ({
        ...prev,
        nights: calculateNights(prev.check_in, prev.check_out)
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form inputs matching backend schema */}
      <input
        name="room_number"
        value={formData.room_number}
        onChange={handleChange}
        placeholder="Room Number"
        required
      />
      {/* Additional form fields... */}
      <button type="submit">Book Room</button>
    </form>
  );
};

export default BookingForm;