// src/components/MembersSidebar.jsx
import React, { useState } from 'react'
import { api } from '../lib/api.js'

export default function MembersSidebar({ open, members, onlineUsers, me, onClose, roomId, isOwner, ownerUsername }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const removeMember = async (username) => {
    if (!isOwner) return
    if (username === ownerUsername) return // don't remove owner
    setBusy(true); setError('')
    try {
      await api.post(`/rooms/${roomId}/remove_member/`, { username })
      const ev = new CustomEvent('members:removed', { detail: { username } })
      window.dispatchEvent(ev)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to remove')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="position-absolute end-0 top-0 h-100 bg-dark text-light border-start p-3" style={{width: 300}}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="m-0">Members</h6>
        <button className="btn btn-sm btn-outline-light" onClick={onClose}>Close</button>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <ul className="list-group list-group-flush">
        {members.map(m => {
          const online = onlineUsers?.has?.(m.username)
          const canRemove = isOwner && m.username !== ownerUsername
          return (
            <li key={m.id} className="list-group-item bg-dark text-light d-flex justify-content-between align-items-center">
              <div>
                <div>{m.username} {m.username === ownerUsername ? ' (owner)' : ''}</div>
                <div className="small text-muted">
                  {online ? 'online' : (m.last_seen_at ? `last seen ${new Date(m.last_seen_at).toLocaleString()}` : 'offline')}
                </div>
              </div>
              {canRemove && (
                <button
                  className="btn btn-sm btn-outline-danger"
                  disabled={busy}
                  onClick={() => removeMember(m.username)}
                >
                  Remove
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
