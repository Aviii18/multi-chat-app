// src/pages/Signup.jsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    const u = username.trim()
    if (!u) e.username = 'Username is required'
    if (/\s/.test(u)) e.username = 'Username cannot contain spaces'

    if (!password) e.password = 'Password is required'
    else if (password.length < 8) e.password = 'Password must be at least 8 characters'

    if (!confirm) e.confirm = 'Confirm your password'
    else if (password !== confirm) e.confirm = 'Passwords do not match'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await signup(username.trim(), password)
      // Redirect to login with a “success” flag
      navigate('/login', { state: { justSignedUp: true, username: username.trim() } })
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Signup failed'
      setErrors({ form: detail })
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center" style={{minHeight:'100vh'}}>
      <div className="card p-4" style={{minWidth: 360}}>
        <h4 className="mb-3">Create your account</h4>

        {errors.form && <div className="alert alert-danger py-2">{errors.form}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              className={`form-control ${errors.username ? 'is-invalid' : ''}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alice"
              autoComplete="username"
              // Optional: block spaces at input level too
              onKeyDown={(e) => { if (e.key === ' ') e.preventDefault() }}
            />
            {errors.username && <div className="invalid-feedback">{errors.username}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className={`form-control ${errors.confirm ? 'is-invalid' : ''}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {errors.confirm && <div className="invalid-feedback">{errors.confirm}</div>}
          </div>

          <button type="submit" className="btn btn-primary w-100">Sign up</button>
        </form>

        <div className="text-center mt-3">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  )
}
