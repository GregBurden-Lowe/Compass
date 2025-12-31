import { useState, useEffect } from 'react'
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ComplaintsList from './pages/ComplaintsList'
import ComplaintDetail from './pages/ComplaintDetail'
import CreateComplaintWizard from './pages/CreateComplaintWizard'
import AdminUsers from './pages/AdminUsers'
import ReferenceData from './pages/ReferenceData'
import Profile from './pages/Profile'
import { useAuth } from './context/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
const logo = new URL('./assets/compass-logo.png', import.meta.url).href
import { api } from './api/client'

export default function App() {
  const { token, role, name, login, logout, mustChangePassword } = useAuth()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [mfaStep, setMfaStep] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [enrollData, setEnrollData] = useState<{ secret: string; otpauth_url: string } | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [remainingSkips, setRemainingSkips] = useState(0)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // If no token is present, surface a gentle prompt to log in.
  useEffect(() => {
    if (!token) {
      setShowLoginPrompt(true)
    } else {
      setShowLoginPrompt(false)
    }
  }, [token])

  // If an admin resets a user's password, force them to change it on next login.
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

  return (
    <>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, #0f172a 0%, #0f4c81 100%)',
          color: '#e5e7eb',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: 1.5, minHeight: 72 }}>
            <Stack direction="row" alignItems="center" spacing={1.6} sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.4, color: '#f8fafc' }}>
                <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Compass
                </Link>
              </Typography>
            </Stack>
            {token && (
              <Stack direction="row" gap={1.5} alignItems="center">
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  {name}
                </Typography>
                <Button color="inherit" component={Link} to="/" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                  Dashboard
                </Button>
                <Button color="inherit" component={Link} to="/complaints" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                  Complaints
                </Button>
                <Button color="inherit" component={Link} to="/profile" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                  Profile
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/complaints/new"
                  disabled={role === 'read_only'}
                  sx={{ fontWeight: 700, color: '#f8fafc' }}
                >
                  New
                </Button>
                {role === 'admin' && (
                  <Button color="inherit" component={Link} to="/admin" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    Admin
                  </Button>
                )}
                {role === 'admin' && (
                  <Button color="inherit" component={Link} to="/reference" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    Reference
                  </Button>
                )}
                <Button color="inherit" onClick={logout} sx={{ fontWeight: 700, color: '#f8fafc' }}>
                  Logout
                </Button>
              </Stack>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {!token ? (
          <Box maxWidth={420} mx="auto" mt={6}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                {showLoginPrompt && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Please log in to continue.
                  </Alert>
                )}
                <Typography variant="h5" gutterBottom>
                  Sign in {import.meta.env.VITE_DEMO_MODE === 'true' && '(demo mode available)'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Use your credentials to access the complaints workspace.
                </Typography>
                {loginError && (
                  <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                    {loginError}
                  </Typography>
                )}
                <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={{ mb: 2.5, mt: 1 }} />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  sx={{ mb: 3 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {mfaStep && (
                  <>
                    <TextField
                      label="MFA code (6 digits)"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Recovery code (optional)"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      fullWidth
                      sx={{ mb: 3 }}
                    />
                  </>
                )}
                <Button variant="contained" fullWidth size="large" onClick={onLogin}>
                  Login
                </Button>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/complaints" element={<ComplaintsList />} />
            <Route path="/complaints/new" element={<CreateComplaintWizard />} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminUsers />} />
            <Route path="/reference" element={<ReferenceData />} />
          </Routes>
        )}
      </Container>
      <Dialog
        open={showEnroll}
        onClose={remainingSkips > 0 ? () => setShowEnroll(false) : undefined}
        disableEscapeKeyDown={remainingSkips <= 0}
      >
        <DialogTitle>Set up MFA</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {remainingSkips <= 0 ? (
              <Typography color="error">You must enable MFA to continue.</Typography>
            ) : (
              <Typography>We recommend enabling MFA. You can skip up to {remainingSkips} more time(s).</Typography>
            )}
            {enrollData ? (
              <>
                <Typography variant="subtitle2">Scan in your authenticator app</Typography>
                <Box display="flex" justifyContent="center">
                  <QRCodeSVG value={enrollData.otpauth_url} size={180} />
                </Box>
                <Typography variant="body2">Secret (manual entry): {enrollData.secret}</Typography>
                <TextField
                  label="6-digit code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  size="small"
                  sx={{ maxWidth: 240 }}
                />
                {recoveryCodes && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recovery codes (store securely)
                    </Typography>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      {recoveryCodes.map((c) => (
                        <Box key={c} sx={{ border: '1px solid #ddd', px: 1.5, py: 0.5, borderRadius: 1, fontFamily: 'monospace' }}>
                          {c}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </>
            ) : (
              <Typography color="text.secondary">Preparing enrollment...</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={skipEnroll} disabled={remainingSkips <= 0}>
            Skip for now
          </Button>
          <Button variant="contained" onClick={verifyEnroll} disabled={!mfaCode || mfaCode.length < 6}>
            Verify & enable
          </Button>
        </DialogActions>
      </Dialog>

    </>
  )
}

