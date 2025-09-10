import React from 'react'
import PresenceDot from './PresenceDot.jsx'

export default function RoomList({ rooms, activeRoomId, onSelect, onlineMap }) {
  return (
    <div className="list-group">
      {rooms.map(r => (
        <button
          key={r.id}
          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center room-item ${activeRoomId===r.id?'active':''}`}
          onClick={() => onSelect(r)}
        >
          <span className="text-start">
            <PresenceDot online={!!onlineMap[r.id]} /> {r.name} {r.is_private ? '🔒' : ''}
          </span>
          <div className="d-flex align-items-center gap-2">
            {typeof r.unread_count === 'number' && r.unread_count > 0 ? (
              <span className="badge text-bg-primary">{r.unread_count}</span>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  )
}
