import { Bed, Tag } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { STATUS_OPTIONS } from '../../lib/status';

// Edit mode: the booking's room and status, plus a line that explains how rooms work for a hold or a group.
export default function EditRoomRow({ f, rooms }) {
  const { targets, booking, isHoldEdit, roomIds, setRoomIds, status, setStatus } = f;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={targets.length > 1 ? 'hidden' : ''}>
        <FieldLabel icon={Bed} htmlFor="b-room">Room</FieldLabel>
        <select id="b-room" name="room" className="field" value={roomIds[0]} onChange={(e) => setRoomIds([Number(e.target.value)])}>
          {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
        </select>
      </div>
      <div>
        <FieldLabel icon={Tag} htmlFor="b-status">Status</FieldLabel>
        <select id="b-status" name="status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {targets.length > 1 ? (
        <p className="col-span-2 -mt-1 text-sm text-muted">
          Rooms {targets.map((t) => t.room_number).join(', ')}. Changes apply to all of them. Click a room number on the calendar to add or remove a room.
        </p>
      ) : isHoldEdit ? (
        <p className="col-span-2 -mt-1 text-sm text-muted">Click another room number on the calendar to hold that room too.</p>
      ) : booking.group_id ? (
        <p className="col-span-2 -mt-1 text-sm text-muted">Booked together with other rooms. Changes here apply to this room only.</p>
      ) : null}
    </div>
  );
}
