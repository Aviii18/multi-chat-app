import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const nav = useNavigate()
  const { signup } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      await signup(username, password)
      nav('/')
    } catch (err) {
      setError(err?.response?.data || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-6 col-lg-4">
        <div className="card p-3">
          <h3 className="mb-3">Create account</h3>
          {error ? <div className="alert alert-danger">{JSON.stringify(error)}</div> : null}
          <form onSubmit={submit} className="d-grid gap-3">
            <input className="form-control" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
            <input className="form-control" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
            <button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Please wait...' : 'Create'}</button>
          </form>
          <div className="mt-3 small text-secondary">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
