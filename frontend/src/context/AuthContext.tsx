import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'
import { UserRole } from '../types'

type AuthState = { token: string | null; role: UserRole | null; name: string | null; userId: string | null }

type AuthContextValue = AuthState & {
  login: (email: string, password: string, mfaCode?: string, recoveryCode?: string) => Promise<any>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({ token: null, role: null, name: null, userId: null })

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token')
      const role = localStorage.getItem('role') as UserRole | null
      const name = localStorage.getItem('name')
      const userId = localStorage.getItem('userId')

      // Demo mode stores a fake token; don't validate against backend.
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        if (token && role) setState({ token, role, name, userId })
        return
      }

      // If we have a token, validate it before trusting it. This prevents
      // rendering authenticated pages with an invalid/expired token (common if
      // backend SECRET_KEY changes on restart).
      if (token) {
        try {
          const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          const validatedRole = me.data.role as UserRole
          localStorage.setItem('role', validatedRole)
          localStorage.setItem('name', me.data.full_name)
          localStorage.setItem('userId', me.data.id)
          setState({ token, role: validatedRole, name: me.data.full_name, userId: me.data.id })
          return
        } catch {
          localStorage.clear()
          setState({ token: null, role: null, name: null, userId: null })
          return
        }
      }

      // No token: clear any partial/stale state.
      if (role || name || userId) localStorage.clear()
      setState({ token: null, role: null, name: null, userId: null })
    }

    load()
  }, [])

  const login = async (email: string, password: string, mfaCode?: string, recoveryCode?: string) => {
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      localStorage.setItem('token', 'demo')
      localStorage.setItem('role', 'admin')
      localStorage.setItem('name', 'Demo User')
      localStorage.setItem('userId', 'demo')
      setState({ token: 'demo', role: 'admin', name: 'Demo User', userId: 'demo' })
      return { mfa_enrollment_required: false, mfa_remaining_skips: 0 }
    }
    const res = await api.post('/auth/token', { email, password, mfa_code: mfaCode, recovery_code: recoveryCode })
    const token = res.data.access_token as string
    localStorage.setItem('token', token)
    const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    const role = me.data.role as UserRole
    localStorage.setItem('role', role)
    localStorage.setItem('name', me.data.full_name)
    localStorage.setItem('userId', me.data.id)
    setState({ token, role, name: me.data.full_name, userId: me.data.id })
    return res.data
  }

  const logout = () => {
    localStorage.clear()
    setState({ token: null, role: null, name: null, userId: null })
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

