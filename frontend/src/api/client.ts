import axios from 'axios'

// Prefer env; avoid hardcoded localhost so remote deploys work.
const envBase = import.meta.env.VITE_API_BASE
const derivedBase =
  envBase ||
  (() => {
    const origin = window.location.origin.replace(/:5173$/, '')
    return `${origin}:8000/api`
  })()

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

