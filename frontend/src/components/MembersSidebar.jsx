import React from 'react'
import PresenceDot from './PresenceDot.jsx'
import { timeAgo } from '../lib/time.js'

export default function MembersSidebar({ open, members, onlineUsers = new Set(), me, onClose }) {
  if (!open) return null
  return (
    <div className="members-sidebar">
      <div className="members-header d-flex justify-content-between align-items-center">
        <h6 className="m-0">Members ({members?.length || 0})</h6>
        <button className="btn btn-sm btn-outline-light" onClick={onClose}>✕</button>
      </div>
      <div className="members-body">
        {(members || []).map(m => {
          const online = onlineUsers.has(m.username)
          const isMe = m.username === me
          return (
            <div key={m.id} className="d-flex align-items-center justify-content-between py-1 px-2 member-row">
              <div className="d-flex align-items-center gap-2">
                <PresenceDot online={online} />
                <span>{m.username}{isMe ? ' (You)' : ''}</span>
              </div>
              {online ? (
                <span className="badge text-bg-success">online</span>
              ) : (
                <span className="small text-secondary">last seen {timeAgo(m.last_seen_at)}</span>
              )}
            </div>
          )
        })}
        {(!members || members.length === 0) ? <div className="text-secondary small p-2">No members yet</div> : null}
      </div>
    </div>
  )
}
