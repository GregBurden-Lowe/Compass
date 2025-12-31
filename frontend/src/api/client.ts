import axios from 'axios'

// Prefer env. If unset:
// - In dev (Vite on :5173): talk directly to backend on :8000
// - In prod (served behind nginx): use same-origin /api (nginx proxies /api -> backend)
const envBase = import.meta.env.VITE_API_BASE as string | undefined
const derivedBase = envBase
  ? envBase
  : window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : '/api'

export const api = axios.create({ baseURL: derivedBase })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // If a token becomes invalid (e.g. backend SECRET_KEY changed on restart),
    // fail closed: clear auth state and return user to login.
    const status = err?.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('name')
      localStorage.removeItem('userId')
      if (typeof window !== 'undefined') {
        // Avoid infinite reload loops if the login screen itself fails.
        if (window.location.pathname !== '/') window.location.assign('/')
      }
    }
    return Promise.reject(err)
  },
)

