import React, { createContext, useContext, useMemo, useState } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  const login = async (username, password) => {
    const { data } = await api.post('/auth/jwt/create/', { username, password })
    const access = data.access || data.token || data.access_token
    const refresh = data.refresh
    setToken(access)
    localStorage.setItem('token', access)
    if (refresh) localStorage.setItem('refresh', refresh)
    setUser({ username })
    localStorage.setItem('user', JSON.stringify({ username }))
  }

  const signup = async (username, password) => {
    await api.post('/signup/', { username, password })
    await login(username, password)
  }

  const logout = () => {
    setToken(null); setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')
  }

  const value = useMemo(() => ({
    token, user, isAuthenticated: !!token, login, signup, logout
  }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
