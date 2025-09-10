import React, { useState } from 'react'
import { api } from '../lib/api.js'

export default function CreateRoomModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  const reset = () => {
    setName('')
    setIsPrivate(false)
    setLoading(false)
    setError(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Room name is required')
      return
    }
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/rooms/', { name: name.trim(), is_private: isPrivate })
      onCreated?.(data)
      reset()
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card card p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="m-0">Create Room</h5>
          <button className="btn btn-sm btn-outline-light" onClick={() => { reset(); onClose?.() }}>✕</button>
        </div>
        {error ? <div className="alert alert-danger py-2">{String(error)}</div> : null}
        <form onSubmit={submit} className="d-grid gap-3">
          <input
            className="form-control"
            placeholder="Room name (e.g., Team Alpha)"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />
          <div className="form-check">
            <input
              id="isPrivate"
              className="form-check-input"
              type="checkbox"
              checked={isPrivate}
              onChange={(e)=>setIsPrivate(e.target.checked)}
            />
            <label htmlFor="isPrivate" className="form-check-label">
              Private room (visible to members only)
            </label>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-light" onClick={() => { reset(); onClose?.() }}>Cancel</button>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
