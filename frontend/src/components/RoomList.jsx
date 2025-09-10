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
            <PresenceDot online={!!onlineMap[r.id]} /> {r.name}
          </span>
          {r.is_private ? <span className="badge text-bg-secondary">Private</span> : null}
        </button>
      ))}
    </div>
  )
}
