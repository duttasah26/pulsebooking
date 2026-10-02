import React, { useState, useEffect } from "react";
import axios from 'axios';

const RoomBookingCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Helper function to get the number of days in a given month
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Room numbers (update as per your actual rooms)
  const roomNumbers = [101, 102, 103, 104, 105];

  // State management
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [draggedCells, setDraggedCells] = useState([]);

  // Fetch bookings from backend
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get('/api/bookings', {
          params: {
            year: currentYear,
            month: currentMonth + 1 // Backend might expect 1-indexed month
          }
        });
        setBookings(response.data);
      } catch (error) {
        console.error('Failed to fetch bookings', error);
      }
    };
    fetchBookings();
  }, [currentMonth, currentYear]);

  // Month navigation
  const changeMonth = (increment) => {
    let newMonth = currentMonth + increment;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Improved booking check function
  const isBooked = (day, roomNumber, month, year) => {
    return bookings.some(booking => {
      const checkInDate = new Date(booking.check_in);
      const checkOutDate = new Date(booking.check_out);
      const targetDate = new Date(year, month, day);

      return (
        booking.room_number === roomNumber &&
        targetDate >= checkInDate &&
        targetDate < checkOutDate
      );
    });
  };

  // Find booking details for a specific cell
  const findBookingDetails = (day, roomNumber, month, year) => {
    return bookings.find(booking => {
      const checkInDate = new Date(booking.check_in);
      const checkOutDate = new Date(booking.check_out);
      const targetDate = new Date(year, month, day);

      return (
        booking.room_number === roomNumber &&
        targetDate >= checkInDate &&
        targetDate < checkOutDate
      );
    });
  };

  // Get the number of days in the current month
  const numDays = getDaysInMonth(currentMonth, currentYear);
  const days = Array.from({ length: numDays }, (_, index) => index + 1);

  // Drag selection handlers
  const handleMouseDown = (day, roomIndex) => {
    setDragStart({ day, roomIndex });
    setDraggedCells([{ day, roomIndex }]);
  };

  const handleMouseEnter = (day, roomIndex) => {
    if (dragStart) {
      const startDay = dragStart.day;
      const startRoomIndex = dragStart.roomIndex;

      const newDraggedCells = [];
      const startD = Math.min(startDay, day);
      const endD = Math.max(startDay, day);

      for (let d = startD; d <= endD; d++) {
        newDraggedCells.push({ day: d, roomIndex: startRoomIndex });
      }

      setDraggedCells(newDraggedCells);
    }
  };

  const handleMouseUp = () => {
    if (draggedCells.length > 0) {
      const sortedCells = draggedCells.sort((a, b) => a.day - b.day);
      const firstCell = sortedCells[0];
      const lastCell = sortedCells[sortedCells.length - 1];

      const checkInDate = new Date(currentYear, currentMonth, firstCell.day);
      const checkOutDate = new Date(currentYear, currentMonth, lastCell.day + 1);

      // Update selected booking details
      setSelectedBooking({
        room_number: roomNumbers[firstCell.roomIndex],
        check_in: checkInDate.toISOString().split('T')[0],
        check_out: checkOutDate.toISOString().split('T')[0],
        name: '',
        phone: '',
        channel: 'Website',
        guests: 1,
        nights: lastCell.day - firstCell.day + 1,
        rate_type: 'EP'
      });
    }

    // Reset drag state
    setDragStart(null);
    setDraggedCells([]);
  };

  // Handle cell click to show booking details
  const handleCellClick = (day, roomNumber) => {
    const booking = findBookingDetails(day, roomNumber, currentMonth, currentYear);
    if (booking) {
      setSelectedBooking(booking);
    }
  };

  // Function to handle booking update/creation
  const handleBookingSubmit = async (bookingData) => {
    try {
      if (selectedBooking && selectedBooking.id) {
        // Update existing booking
        await axios.patch(`/api/bookings/${selectedBooking.id}`, bookingData);
      } else {
        // Create new booking
        await axios.post('/api/bookings', bookingData);
      }
      
      // Refresh bookings
      const response = await axios.get('/api/bookings', {
        params: {
          year: currentYear,
          month: currentMonth + 1
        }
      });
      setBookings(response.data);
      
      // Reset selected booking
      setSelectedBooking(null);
    } catch (error) {
      console.error('Booking operation failed', error.response ? error.response.data : error.message);
      alert(`Operation failed: ${error.response ? error.response.data.error : error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-5 flex space-x-10">
      {/* Calendar */}
      <div className="calendar-container flex flex-col items-center w-2/3">
        <div className="flex items-center justify-between w-full mb-4">
          <button 
            onClick={() => changeMonth(-1)} 
            className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
          >
            Previous Month
          </button>
          <h2 className="text-2xl font-bold">
            {`${currentMonth + 1}/${currentYear}`}
          </h2>
          <button 
            onClick={() => changeMonth(1)} 
            className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
          >
            Next Month
          </button>
        </div>
        <table 
          className="table-auto border-collapse border border-gray-200 w-full"
          onMouseUp={handleMouseUp}
        >
          <thead>
            <tr>
              <th className="border border-gray-200 p-2">Day</th>
              {roomNumbers.map((room) => (
                <th key={room} className="border border-gray-200 p-2">
                  Room {room}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="border border-gray-200 p-2">{day}</td>
                {roomNumbers.map((room, index) => (
                  <td
                    key={room}
                    onMouseDown={() => handleMouseDown(day, index)}
                    onMouseEnter={() => handleMouseEnter(day, index)}
                    onClick={() => handleCellClick(day, room)}
                    className={`border border-gray-200 p-4 cursor-pointer ${
                      isBooked(day, room, currentMonth, currentYear)
                        ? "bg-green-200" 
                        : (draggedCells.some(cell => 
                            cell.day === day && cell.roomIndex === index
                          ) 
                          ? "bg-blue-300"
                          : "bg-white hover:bg-blue-100")
                    }`}
                  >
                    {isBooked(day, room, currentMonth, currentYear) ? "Booked" : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Booking Form */}
      <div className="form-container w-1/3 p-5 bg-gray-50 border border-gray-200 rounded-md shadow-md">
        <h3 className="text-xl font-semibold mb-4">
          {selectedBooking ? 'Booking Details' : 'New Booking'}
        </h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          // Prepare booking data from form or selected booking
          const bookingData = selectedBooking || {
            room_number: roomNumbers[0],
            check_in: new Date().toISOString().split('T')[0],
            check_out: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
          };
          handleBookingSubmit(bookingData);
        }}>
          <div className="mb-4">
            <label className="block mb-2">Room Number:</label>
            <select
              value={selectedBooking ? selectedBooking.room_number : roomNumbers[0]}
              onChange={(e) => setSelectedBooking(prev => ({
                ...prev,
                room_number: parseInt(e.target.value)
              }))}
              className={`border p-2 rounded-md w-full ${selectedBooking ? 'bg-gray-100' : ''}`}
              disabled={!!selectedBooking}
            >
              {roomNumbers.map(room => (
                <option key={room} value={room}>Room {room}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-2">Guest Name:</label>
            <input
              type="text"
              value={selectedBooking ? selectedBooking.name : ''}
              onChange={(e) => setSelectedBooking(prev => ({
                ...prev,
                name: e.target.value
              }))}
              className={`border p-2 rounded-md w-full ${selectedBooking ? '' : 'bg-gray-100'}`}
              readOnly={!selectedBooking}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Phone:</label>
            <input
              type="tel"
              value={selectedBooking ? selectedBooking.phone || '' : ''}
              onChange={(e) => setSelectedBooking(prev => ({
                ...prev,
                phone: e.target.value
              }))}
              className={`border p-2 rounded-md w-full ${selectedBooking ? '' : 'bg-gray-100'}`}
              readOnly={!selectedBooking}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Check-in Date:</label>
            <input
              type="date"
              value={selectedBooking ? selectedBooking.check_in : ''}
              onChange={(e) => setSelectedBooking(prev => ({
                ...prev,
                check_in: e.target.value
              }))}
              className={`border p-2 rounded-md w-full ${selectedBooking ? '' : 'bg-gray-100'}`}
              readOnly={!selectedBooking}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Check-out Date:</label>
            <input
              type="date"
              value={selectedBooking ? selectedBooking.check_out : ''}
              onChange={(e) => setSelectedBooking(prev => ({
                ...prev,
                check_out: e.target.value
              }))}
              className={`border p-2 rounded-md w-full ${selectedBooking ? '' : 'bg-gray-100'}`}
              readOnly={!selectedBooking}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Guests:</label>
            <input
              type="number"
              value={selectedBooking ? selectedBooking.guests : 1}
              onChange={(e) => setSelectedBooking(prev => ({
                ...prev,
                guests: parseInt(e.target.value)
              }))}
              min="1"
              className={`border p-2 rounded-md w-full ${selectedBooking ? '' : 'bg-gray-100'}`}
              readOnly={!selectedBooking}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Channel:</label>
            <select
              value={selectedBooking ? selectedBooking.channel : 'Website'}
              onChange={(e) => setSelectedBooking(prev => ({
                ...prev,
                channel: e.target.value
              }))}
              className={`border p-2 rounded-md w-full ${selectedBooking ? '' : 'bg-gray-100'}`}
              disabled={!selectedBooking}
            >
              <option value="Direct">Direct</option>
              <option value="Phone">Phone</option>
              <option value="Email">Email</option>
              <option value="Website">Website</option>
            </select>
          </div>

          {selectedBooking && (
            <div className="mb-4">
              <label className="block mb-2">Rate Type:</label>
              <select
                value={selectedBooking.rate_type}
                onChange={(e) => setSelectedBooking(prev => ({
                  ...prev,
                  rate_type: e.target.value
                }))}
                className="border p-2 rounded-md w-full"
              >
                <option value="EP">EP</option>
                <option value="CP">CP</option>
                <option value="MAP">MAP</option>
              </select>
            </div>
          )}

          <div className="flex space-x-2">
            {selectedBooking ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="w-1/2 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                >
                  Update
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
              >
                Create Booking
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomBookingCalendar;