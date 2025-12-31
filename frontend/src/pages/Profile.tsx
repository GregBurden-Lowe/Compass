import { useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { name, mustChangePassword, refreshMe } = useAuth()
  const location = useLocation()
  const forced = !!(location.state as any)?.forced || mustChangePassword

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    if (!newPassword || newPassword.length < 8) return false
    if (newPassword !== confirmPassword) return false
    if (!currentPassword) return false
    return true
  }, [newPassword, confirmPassword, currentPassword])

  const onChangePassword = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.post('/auth/password/change', { current_password: currentPassword, new_password: newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      await refreshMe()
      setSuccess('Password updated.')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Signed in as {name || '—'}
      </Typography>

      <Card sx={{ maxWidth: 520, mt: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            {forced && (
              <Alert severity="warning">
                Your password has been reset by an admin. You must set a new password before continuing.
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Typography variant="subtitle1">Change password</Typography>
            <TextField
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="New password (min 8 chars)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
            />

            <Button variant="contained" onClick={onChangePassword} disabled={!canSubmit || saving}>
              Update password
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}


