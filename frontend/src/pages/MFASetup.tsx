import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../api/client'

type EnrollResponse = {
  secret: string
  otpauth_url: string
}

export default function MFASetup() {
  const [status, setStatus] = useState<{ mfa_enabled: boolean }>({ mfa_enabled: false })
  const [enroll, setEnroll] = useState<EnrollResponse | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadStatus = async () => {
    const res = await api.get('/auth/mfa/status')
    setStatus(res.data)
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const startEnroll = async () => {
    setError(null)
    setSuccess(null)
    setRecoveryCodes(null)
    setLoading(true)
    try {
      const res = await api.post<EnrollResponse>('/auth/mfa/enroll')
      setEnroll(res.data)
      setCode('')
      setStatus({ mfa_enabled: false })
      setSuccess('MFA enrollment started. Scan the QR code and enter a 6-digit code to confirm.')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to start enrollment')
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await api.post<{ recovery_codes: string[] }>('/auth/mfa/verify', { code })
      setRecoveryCodes(res.data.recovery_codes)
      setEnroll(null)
      setStatus({ mfa_enabled: true })
      setSuccess('MFA enabled. Save your recovery codes in a safe place.')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Multi-factor authentication (MFA)
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="body1">
              Status: <strong>{status.mfa_enabled ? 'Enabled' : 'Not enabled'}</strong>
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            {!status.mfa_enabled && (
              <Button variant="contained" onClick={startEnroll} disabled={loading}>
                Start enrollment
              </Button>
            )}

            {enroll && (
              <Stack spacing={2}>
                <Typography variant="subtitle1">Step 1: Scan this QR code in your authenticator app</Typography>
                <QRCodeSVG value={enroll.otpauth_url} size={200} />
                <Typography variant="body2">Secret (manual entry): {enroll.secret}</Typography>
                <Typography variant="subtitle1">Step 2: Enter the 6-digit code from your app</Typography>
                <TextField label="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} size="small" sx={{ maxWidth: 240 }} />
                <Button variant="contained" onClick={verify} disabled={loading || code.length === 0}>
                  Verify and enable
                </Button>
              </Stack>
            )}

            {recoveryCodes && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Recovery codes (store securely)
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {recoveryCodes.map((c) => (
                    <Box key={c} sx={{ border: '1px solid #ddd', px: 1.5, py: 0.5, borderRadius: 1, fontFamily: 'monospace' }}>
                      {c}
                    </Box>
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Each recovery code can be used once. Keep them safe.
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}


