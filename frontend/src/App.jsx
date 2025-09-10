import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Chat from './pages/Chat.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function NavBar() {
  const { isAuthenticated, user, logout } = useAuth()
  return (
    <nav className="navbar navbar-expand-lg border-bottom">
      <div className="container-fluid">
        <Link className="navbar-brand text-light" to="/">💬 Realtime Chat</Link>
        <div className="d-flex gap-2">
          {isAuthenticated ? (
            <>
              <span className="text-secondary small me-2">Hello, {user?.username}</span>
              <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-vh-100 d-flex flex-column">
        <NavBar />
        <div className="container py-3 flex-grow-1">
          <Routes>
            <Route path="/" element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  )
}
