import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE || 'http://178.62.211.191:8000/api'

export const api = axios.create({ baseURL })

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

