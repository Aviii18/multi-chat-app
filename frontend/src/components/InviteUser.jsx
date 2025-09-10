import React, { useState } from 'react'
import { api } from '../lib/api.js'

export default function InviteUser({ roomId, disabled }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const invite = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true); setMsg(null); setErr(null)
    try {
      const { data } = await api.post(`/rooms/${roomId}/invite/`, { username: username.trim() })
      setMsg(`Invited ${username.trim()}`)
      setUsername('')
    } catch (error) {
      const detail = error?.response?.data?.detail || 'Invite failed'
      setErr(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={invite} className="d-flex align-items-center gap-2">
      <input
        className="form-control form-control-sm"
        placeholder="Invite username"
        value={username}
        onChange={(e)=>setUsername(e.target.value)}
        disabled={disabled || loading}
        style={{maxWidth: 220}}
      />
      <button className="btn btn-sm btn-outline-light" disabled={disabled || loading} type="submit">
        {loading ? 'Inviting...' : 'Invite'}
      </button>
      {msg ? <span className="small text-success">{msg}</span> : null}
      {err ? <span className="small text-danger">{err}</span> : null}
    </form>
  )
}
