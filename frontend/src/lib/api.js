import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
})

// Always attach Bearer token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  } else if (config?.headers?.Authorization) {
    delete config.headers.Authorization
  }
  return config
})

// Optional: if token is bad/expired, auto-logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // soft redirect without import cycles
      if (location.pathname !== '/login') location.assign('/login')
    }
    return Promise.reject(err)
  }
)
