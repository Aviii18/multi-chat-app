// src/pages/Login.jsx
import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState(location.state?.username || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [signupMsg, setSignupMsg] = useState('')

  useEffect(() => {
    if (location.state?.justSignedUp) {
      setSignupMsg('Signup successful! Please log in.')
      // clear state so it doesn't persist on back/forward
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(username.trim(), password)
      navigate('/') // or wherever your chat dashboard route is
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center" style={{minHeight:'100vh'}}>
      <div className="card p-4" style={{minWidth: 360}}>
        <h4 className="mb-3">Log in</h4>

        {signupMsg && <div className="alert alert-success py-2">{signupMsg}</div>}
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary w-100">Log in</button>
        </form>

        <div className="text-center mt-3">
          New here? <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
