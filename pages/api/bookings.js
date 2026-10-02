import db from './db'

// Helper function to check for booking conflicts
const checkBookingConflicts = (room_number, check_in, check_out) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM bookings 
      WHERE room_number = ? AND (
        (check_in < ? AND check_out > ?) OR
        (check_in >= ? AND check_in < ?) OR
        (check_out > ? AND check_out <= ?)
      )
    `;

    const values = [
      room_number, 
      check_out, check_in,  // Check if new booking overlaps existing bookings
      check_in, check_out,
      check_in, check_out
    ];

    db.query(query, values, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.length > 0);
      }
    });
  });
};

// Validate date format and logic
const validateBookingDates = (check_in, check_out) => {
  const startDate = new Date(check_in);
  const endDate = new Date(check_out);

  // Check if dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { 
      valid: false, 
      error: 'Invalid date format' 
    };
  }

  // Check that check-out is after check-in
  if (endDate <= startDate) {
    return { 
      valid: false, 
      error: 'Check-out date must be after check-in date' 
    };
  }

  // Optional: Prevent bookings too far in the past or future
  const today = new Date();
  const maxBookingWindow = new Date();
  maxBookingWindow.setFullYear(today.getFullYear() + 2);

  if (startDate < today || startDate > maxBookingWindow) {
    return { 
      valid: false, 
      error: 'Booking dates must be within the next 2 years' 
    };
  }

  return { valid: true };
};

export default async function handler(req, res) {
  // Ensure database connection
  if (req.method === 'GET') {
    // Optional: Add filtering for month and year
    const { year, month } = req.query;
    
    let query = 'SELECT * FROM bookings';
    let queryParams = [];

    if (year && month) {
      query += ' WHERE YEAR(check_in) = ? AND MONTH(check_in) = ?';
      queryParams = [parseInt(year), parseInt(month)];
    }

    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ 
          error: 'Failed to fetch bookings', 
          details: err.message 
        });
      }
      res.status(200).json(results);
    });
  } 
  else if (req.method === 'POST') {
    const { 
      room_number, 
      name, 
      channel, 
      guests, 
      nights, 
      rate_type, 
      check_in, 
      check_out 
    } = req.body;

    // Validate required fields
    if (!room_number || !name || !check_in || !check_out) {
      return res.status(400).json({ 
        error: 'Missing required booking fields' 
      });
    }

    // Validate dates
    const dateValidation = validateBookingDates(check_in, check_out);
    if (!dateValidation.valid) {
      return res.status(400).json({ 
        error: dateValidation.error 
      });
    }

    try {
      // Check for booking conflicts
      const hasConflicts = await checkBookingConflicts(room_number, check_in, check_out);
      if (hasConflicts) {
        return res.status(409).json({ 
          error: 'Room is already booked for the selected dates' 
        });
      }

      const query = `
        INSERT INTO bookings 
        (room_number, name, channel, guests, nights, rate_type, check_in, check_out)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        room_number, 
        name, 
        channel || 'Website', 
        guests || 1, 
        nights || 1, 
        rate_type || 'EP', 
        check_in, 
        check_out
      ];

      db.query(query, values, (err, result) => {
        if (err) {
          console.error('Booking insertion error:', err);
          return res.status(500).json({ 
            error: 'Failed to save booking', 
            details: err.message 
          });
        }
        res.status(201).json({ 
          success: true, 
          bookingId: result.insertId 
        });
      });
    } catch (error) {
      console.error('Booking conflict check error:', error);
      res.status(500).json({ 
        error: 'An unexpected error occurred', 
        details: error.message 
      });
    }
  } 
  else if (req.method === 'PUT') {
    const { id } = req.query;
    const updateData = req.body;

    // Validate date if present
    if (updateData.check_in && updateData.check_out) {
      const dateValidation = validateBookingDates(updateData.check_in, updateData.check_out);
      if (!dateValidation.valid) {
        return res.status(400).json({ 
          error: dateValidation.error 
        });
      }
    }

    // Dynamic update query
    const updateFields = Object.keys(updateData)
      .filter(key => ['room_number', 'name', 'channel', 'guests', 'nights', 'rate_type', 'check_in', 'check_out'].includes(key))
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(updateData)
      .filter(key => ['room_number', 'name', 'channel', 'guests', 'nights', 'rate_type', 'check_in', 'check_out'].includes(key))
      .map(key => updateData[key]);

    values.push(id);

    const query = `UPDATE bookings SET ${updateFields} WHERE id = ?`;

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Booking update error:', err);
        return res.status(500).json({ 
          error: 'Failed to update booking', 
          details: err.message 
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          error: 'Booking not found' 
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Booking updated successfully' 
      });
    });
  } 
  else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}