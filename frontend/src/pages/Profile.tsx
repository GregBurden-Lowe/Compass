import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'
import { TopBar } from '../components/layout'
import { Button, Input, Card, CardHeader, CardTitle, CardBody, Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui'
import { api } from '../api/client'
import { QRCodeSVG } from 'qrcode.react'
import dayjs from 'dayjs'

export default function Profile() {
  const { user } = useAuth()
  const location = useLocation()
  const forced = (location.state as any)?.forced
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  
  // MFA states
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [showMfaEnroll, setShowMfaEnroll] = useState(false)
  const [enrollData, setEnrollData] = useState<{ secret: string; otpauth_url: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaMessage, setMfaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Load MFA status
  useEffect(() => {
    if (user) {
      setMfaEnabled(user.mfa_enabled || false)
    }
  }, [user])

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' }
    
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++
    
    if (score <= 2) return { score, label: 'Weak', color: 'bg-semantic-error' }
    if (score === 3) return { score, label: 'Fair', color: 'bg-semantic-warning' }
    if (score === 4) return { score, label: 'Good', color: 'bg-semantic-info' }
    return { score, label: 'Strong', color: 'bg-semantic-success' }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setMessage({ type: 'success', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to change password' })
    } finally {
      setLoading(false)
    }
  }

  const startMfaEnroll = async () => {
    setMfaLoading(true)
    setMfaMessage(null)
    try {
      const res = await api.post('/auth/mfa/enroll')
      setEnrollData(res.data)
      setRecoveryCodes(null)
      setMfaCode('')
      setShowMfaEnroll(true)
    } catch (err: any) {
      setMfaMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to start MFA enrollment' })
    } finally {
      setMfaLoading(false)
    }
  }

  const verifyMfaEnroll = async () => {
    setMfaLoading(true)
    setMfaMessage(null)
    try {
      const res = await api.post('/auth/mfa/verify', { code: mfaCode })
      setRecoveryCodes(res.data.recovery_codes)
      setMfaEnabled(true)
      setMfaMessage({ type: 'success', text: 'MFA enabled successfully! Save your recovery codes.' })
    } catch (err: any) {
      setMfaMessage({ type: 'error', text: err?.response?.data?.detail || 'Invalid MFA code' })
    } finally {
      setMfaLoading(false)
    }
  }

  const disableMfa = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) return
    
    setMfaLoading(true)
    setMfaMessage(null)
    try {
      await api.post('/auth/mfa/disable')
      setMfaEnabled(false)
      setMfaMessage({ type: 'success', text: 'MFA disabled successfully' })
    } catch (err: any) {
      setMfaMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to disable MFA' })
    } finally {
      setMfaLoading(false)
    }
  }

  const regenerateRecoveryCodes = async () => {
    if (!confirm('This will invalidate your existing recovery codes. Continue?')) return
    
    setMfaLoading(true)
    setMfaMessage(null)
    try {
      const res = await api.post('/auth/mfa/recovery/regenerate')
      setRecoveryCodes(res.data.recovery_codes)
      setMfaMessage({ type: 'success', text: 'Recovery codes regenerated! Save them securely.' })
    } catch (err: any) {
      setMfaMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to regenerate recovery codes' })
    } finally {
      setMfaLoading(false)
    }
  }

  const copyRecoveryCodes = () => {
    if (!recoveryCodes) return
    const text = recoveryCodes.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setMfaMessage({ type: 'success', text: 'Recovery codes copied to clipboard' })
    })
  }

  const closeMfaEnroll = () => {
    setShowMfaEnroll(false)
    setEnrollData(null)
    setMfaCode('')
    setRecoveryCodes(null)
    setMfaMessage(null)
  }

  return (
    <>
      <TopBar title="Profile & Settings" />

      <div className="px-10 py-6 max-w-2xl">
        {/* Forced password change notice */}
        {forced && (
          <div className="mb-6 rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-semantic-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-semantic-warning">Password change required</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  For security reasons, you must change your password before continuing.
                </p>
              </div>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Name</label>
                <div className="text-sm text-text-primary">{user?.full_name}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Email</label>
                <div className="text-sm text-text-primary">{user?.email}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Role</label>
                <div className="text-sm text-text-primary capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
              {user?.created_at && (
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Account Created</label>
                  <div className="text-sm text-text-secondary">
                    {dayjs(user.created_at).format('MMMM D, YYYY [at] h:mm A')}
                  </div>
                </div>
              )}
              {user?.last_login && (
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Last Login</label>
                  <div className="text-sm text-text-secondary">
                    {dayjs(user.last_login).format('MMMM D, YYYY [at] h:mm A')}
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* MFA Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Multi-Factor Authentication</CardTitle>
          </CardHeader>
          <CardBody>
            {mfaMessage && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm ${
                  mfaMessage.type === 'success'
                    ? 'border-semantic-success/30 bg-semantic-success/5 text-semantic-success'
                    : 'border-semantic-error/30 bg-semantic-error/5 text-semantic-error'
                }`}
              >
                {mfaMessage.text}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">MFA Status</div>
                  <div className="text-xs text-text-secondary mt-1">
                    {mfaEnabled ? 'Your account is protected with MFA' : 'Add an extra layer of security'}
                  </div>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${
                  mfaEnabled 
                    ? 'bg-semantic-success/10 text-semantic-success' 
                    : 'bg-gray-100 text-text-muted'
                }`}>
                  {mfaEnabled ? '✓ Enabled' : 'Disabled'}
                </div>
              </div>

              {recoveryCodes && (
                <div className="rounded-lg border border-border bg-app p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-text-primary">Your Recovery Codes</h4>
                    <button
                      onClick={copyRecoveryCodes}
                      className="text-xs text-brand hover:text-brand-dark font-medium"
                    >
                      Copy All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {recoveryCodes.map((code) => (
                      <code key={code} className="text-xs bg-surface p-2 rounded border border-border font-mono">
                        {code}
                      </code>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted">
                    ⚠️ Save these codes in a secure location. Each code can only be used once.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {!mfaEnabled ? (
                  <Button variant="primary" onClick={startMfaEnroll} disabled={mfaLoading}>
                    {mfaLoading ? 'Setting up...' : 'Enable MFA'}
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={regenerateRecoveryCodes} disabled={mfaLoading}>
                      {mfaLoading ? 'Regenerating...' : 'Regenerate Recovery Codes'}
                    </Button>
                    <Button variant="secondary" onClick={disableMfa} disabled={mfaLoading}>
                      {mfaLoading ? 'Disabling...' : 'Disable MFA'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardBody>
            {message && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm ${
                  message.type === 'success'
                    ? 'border-semantic-success/30 bg-semantic-success/5 text-semantic-success'
                    : 'border-semantic-error/30 bg-semantic-error/5 text-semantic-error'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                  >
                    {showCurrentPassword ? (
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

              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                  >
                    {showNewPassword ? (
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
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-app rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-text-secondary">{passwordStrength.label}</span>
                    </div>
                    <ul className="text-xs text-text-muted space-y-0.5">
                      <li className={newPassword.length >= 8 ? 'text-semantic-success' : ''}>
                        {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                      </li>
                      <li className={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'text-semantic-success' : ''}>
                        {/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? '✓' : '○'} Mixed case letters
                      </li>
                      <li className={/\d/.test(newPassword) ? 'text-semantic-success' : ''}>
                        {/\d/.test(newPassword) ? '✓' : '○'} At least one number
                      </li>
                      <li className={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-semantic-success' : ''}>
                        {/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '○'} Special character (!@#$%, etc.)
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                  >
                    {showConfirmPassword ? (
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
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-semantic-error">Passwords do not match</p>
                )}
              </div>

              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* MFA Enrollment Modal */}
        <Modal open={showMfaEnroll} onClose={closeMfaEnroll}>
          <ModalHeader onClose={closeMfaEnroll}>
            Set up Multi-Factor Authentication
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {enrollData && !recoveryCodes ? (
                <>
                  <p className="text-sm text-text-secondary">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  
                  <div className="flex justify-center p-4 bg-app rounded-lg">
                    <QRCodeSVG value={enrollData.otpauth_url} size={200} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-text-primary mb-1">Manual entry secret</p>
                    <code className="block text-xs bg-app p-2 rounded border border-border font-mono break-all">
                      {enrollData.secret}
                    </code>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">
                      Enter the 6-digit code from your app
                    </label>
                    <Input
                      type="text"
                      autoFocus
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>

                  {mfaMessage && (
                    <div
                      className={`rounded-lg border p-3 text-sm ${
                        mfaMessage.type === 'success'
                          ? 'border-semantic-success/30 bg-semantic-success/5 text-semantic-success'
                          : 'border-semantic-error/30 bg-semantic-error/5 text-semantic-error'
                      }`}
                    >
                      {mfaMessage.text}
                    </div>
                  )}
                </>
              ) : recoveryCodes ? (
                <>
                  <div className="rounded-lg border border-semantic-success/30 bg-semantic-success/5 p-3 text-sm text-semantic-success">
                    ✓ MFA enabled successfully!
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-text-primary">Recovery Codes</h4>
                      <button
                        onClick={copyRecoveryCodes}
                        className="text-xs text-brand hover:text-brand-dark font-medium"
                      >
                        Copy All
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {recoveryCodes.map((code) => (
                        <code key={code} className="text-xs bg-app p-2 rounded border border-border font-mono">
                          {code}
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-text-muted">
                      ⚠️ Save these codes in a secure location. Each code can only be used once if you lose access to your authenticator app.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-muted">Preparing MFA enrollment...</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            {!recoveryCodes ? (
              <>
                <Button variant="secondary" onClick={closeMfaEnroll}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={verifyMfaEnroll} 
                  disabled={mfaCode.length !== 6 || mfaLoading}
                >
                  {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={closeMfaEnroll}>
                Done
              </Button>
            )}
          </ModalFooter>
        </Modal>
      </div>
    </>
  )
}
