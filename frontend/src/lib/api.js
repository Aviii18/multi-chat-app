import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
})

// Attach Bearer on every request
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

let isRefreshing = false
let queue = []

function flushQueue(error, newToken) {
  queue.forEach(({resolve, reject, config}) => {
    if (error) reject(error)
    else {
      if (newToken) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${newToken}`
      }
      resolve(api(config))
    }
  })
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status
    const original = err?.config
    if (status === 401 && original && !original._retry) {
      const refresh = localStorage.getItem('refresh')
      if (!refresh) {
        // no refresh → hard logout
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (location.pathname !== '/login') location.assign('/login')
        return Promise.reject(err)
      }
      original._retry = true

      if (isRefreshing) {
        // Queue up while a refresh is in-flight
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject, config: original })
        })
      }

      try {
        isRefreshing = true
        const { data } = await axios.post(`${API_BASE}/auth/jwt/refresh/`, { refresh })
        const newAccess = data.access
        localStorage.setItem('token', newAccess)
        isRefreshing = false
        flushQueue(null, newAccess)
        // Retry the original request with new token
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (e) {
        isRefreshing = false
        flushQueue(e, null)
        // Refresh failed → clear tokens and go to login
        localStorage.removeItem('token')
        localStorage.removeItem('refresh')
        localStorage.removeItem('user')
        if (location.pathname !== '/login') location.assign('/login')
        return Promise.reject(e)
      }
    }

    return Promise.reject(err)
  }
)
