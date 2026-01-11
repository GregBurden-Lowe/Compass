import { useState, useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ComplaintsList from './pages/ComplaintsList'
import ComplaintDetail from './pages/ComplaintDetail'
import CreateComplaintWizard from './pages/CreateComplaintWizard'
import MyTasks from './pages/MyTasks'
import AdminUsers from './pages/AdminUsers'
import ReferenceData from './pages/ReferenceData'
import Profile from './pages/Profile'
import { useAuth } from './context/AuthContext'
import { AppShell } from './components/layout'
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from './components/ui'
import { QRCodeSVG } from 'qrcode.react'
import { api } from './api/client'

export default function App() {
  const { token, role, name, login, logout, mustChangePassword, ready } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [mfaStep, setMfaStep] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [enrollData, setEnrollData] = useState<{ secret: string; otpauth_url: string } | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [remainingSkips, setRemainingSkips] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  // Auth gate
  useEffect(() => {
    if (!ready) return
    if (token) return
    if (location.pathname === '/') return
    navigate('/', { replace: true })
  }, [ready, token, location.pathname, navigate])

  // Force password change
  useEffect(() => {
    if (!token) return
    if (!mustChangePassword) return
    if (location.pathname === '/profile') return
    navigate('/profile', { replace: true, state: { forced: true } })
  }, [token, mustChangePassword, location.pathname, navigate])

  const onLogin = async () => {
    setLoginError(null)
    try {
      const res = await login(email, password, mfaStep ? mfaCode : undefined, mfaStep ? recoveryCode : undefined)
      setMfaStep(false)
      setMfaCode('')
      setRecoveryCode('')
      if (res?.mfa_enrollment_required) {
        setRemainingSkips(res.mfa_remaining_skips || 0)
        await startEnroll()
      } else {
        navigate('/')
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (detail === 'MFA code required' || detail?.code === 'mfa_required') {
        setMfaStep(true)
        setLoginError('Enter your 6-digit MFA code or a recovery code.')
      } else if (detail === 'Invalid recovery code' || detail === 'Invalid MFA code' || detail === 'Invalid code') {
        setLoginError('Invalid code. Please try again.')
      } else {
        setLoginError('Login failed. Check your credentials.')
      }
    }
  }

  const startEnroll = async () => {
    try {
      const res = await api.post('/auth/mfa/enroll')
      setEnrollData(res.data)
      setRecoveryCodes(null)
      setShowEnroll(true)
    } catch (err: any) {
      setLoginError(err?.response?.data?.detail || 'Could not start MFA enrollment')
    }
  }

  const verifyEnroll = async () => {
    try {
      const res = await api.post('/auth/mfa/verify', { code: mfaCode })
      setRecoveryCodes(res.data.recovery_codes)
      setShowEnroll(false)
      setMfaCode('')
      setRemainingSkips(0)
      navigate('/')
    } catch (err: any) {
      setLoginError(err?.response?.data?.detail || 'Invalid code')
    }
  }

  const skipEnroll = async () => {
    try {
      const res = await api.post('/auth/mfa/skip')
      setRemainingSkips(res.data.remaining_skips)
      setShowEnroll(false)
      setEnrollData(null)
    } catch (err: any) {
      setLoginError(err?.response?.data?.detail || 'Cannot skip MFA')
    }
  }

  // Login page
  if (!token) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-border bg-surface shadow-card p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold text-text-primary mb-2">Sign in to Compass</h1>
              <p className="text-sm text-text-secondary">
                Use your credentials to access the complaints workspace
              </p>
            </div>

            {loginError && (
              <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
                {loginError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                onLogin()
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {mfaStep && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">MFA Code (6 digits)</label>
                    <Input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Recovery Code (optional)</label>
                    <Input
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="recovery-code"
                    />
                  </div>
                </>
              )}

              <Button type="submit" variant="primary" className="w-full mt-6">
                Sign in
              </Button>
            </form>
          </div>
        </div>

        {/* MFA Enrollment Modal */}
        <Modal open={showEnroll} onClose={remainingSkips > 0 ? () => setShowEnroll(false) : () => {}}>
          <ModalHeader onClose={remainingSkips > 0 ? () => setShowEnroll(false) : undefined}>
            Set up Multi-Factor Authentication
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {remainingSkips <= 0 ? (
                <div className="rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
                  You must enable MFA to continue.
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  We recommend enabling MFA for enhanced security. You can skip up to {remainingSkips} more time(s).
                </p>
              )}

              {enrollData ? (
                <>
                  <div>
                    <p className="text-xs font-medium text-text-primary mb-2">Scan with your authenticator app</p>
                    <div className="flex justify-center p-4 bg-app rounded-lg">
                      <QRCodeSVG value={enrollData.otpauth_url} size={180} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-text-primary mb-1">Manual entry secret</p>
                    <code className="block text-xs bg-app p-2 rounded border border-border font-mono">
                      {enrollData.secret}
                    </code>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Enter 6-digit code</label>
                    <Input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>

                  {recoveryCodes && (
                    <div>
                      <p className="text-xs font-medium text-text-primary mb-2">
                        Recovery codes (store securely)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {recoveryCodes.map((c) => (
                          <code key={c} className="text-xs bg-app p-2 rounded border border-border font-mono">
                            {c}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-muted">Preparing enrollment...</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={skipEnroll} disabled={remainingSkips <= 0}>
              Skip for now
            </Button>
            <Button variant="primary" onClick={verifyEnroll} disabled={!mfaCode || mfaCode.length < 6}>
              Verify & Enable
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    )
  }

  // Authenticated app
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<MyTasks />} />
        <Route path="/complaints" element={<ComplaintsList />} />
        <Route path="/create" element={<CreateComplaintWizard />} />
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/reference" element={<ReferenceData />} />
        <Route path="/settings" element={<Profile />} />
      </Routes>
    </AppShell>
  )
}
