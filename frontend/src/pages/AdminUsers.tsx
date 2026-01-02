import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../api/client'
import { User, UserRole } from '../types'
import { useAuth } from '../context/AuthContext'

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'complaints_handler', label: 'Complaints Handler' },
  { value: 'complaints_manager', label: 'Complaints Manager' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'read_only', label: 'Read only' },
]

type CreateUserForm = {
  email: string
  full_name: string
  password: string
  role: UserRole
  is_active: boolean
}

export default function AdminUsers() {
  const { role } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingCodes, setLoadingCodes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<Record<string, string[]>>({})
  const [resetDialog, setResetDialog] = useState<{ open: boolean; email: string; tempPassword: string } | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    full_name: '',
    password: '',
    role: 'complaints_handler',
    is_active: true,
  })

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<User[]>('/users')
      setUsers(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const createUser = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.post('/users', form)
      setForm({ email: '', full_name: '', password: '', role: 'complaints_handler', is_active: true })
      setShowCreateDialog(false)
      await loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const updateUser = async (id: string, payload: Partial<CreateUserForm>) => {
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/users/${id}`, payload)
      await loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const resetMfa = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      await api.post(`/auth/mfa/reset/${id}`)
      await loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reset MFA')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async (id: string, email: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await api.post<{ temporary_password: string }>(`/users/${id}/reset-password`)
      setResetDialog({ open: true, email, tempPassword: res.data.temporary_password })
      await loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  const fetchRecoveryCodes = async (id: string) => {
    setLoadingCodes(true)
    setError(null)
    try {
      const res = await api.post<{ recovery_codes: string[] }>(`/auth/mfa/recovery/${id}/regenerate`)
      setRecoveryCodes((prev) => ({ ...prev, [id]: res.data.recovery_codes }))
      setExpandedUserId(id)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to get recovery codes')
    } finally {
      setLoadingCodes(false)
    }
  }

  if (role !== 'admin') {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Admin only
        </Typography>
        <Typography color="text.secondary">You need admin rights to manage users.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        User management
      </Typography>
      {resetDialog?.open && (
        <Dialog open onClose={() => setResetDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Password reset</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">
                This user will be forced to change their password on next login. Copy the temporary password and email it to them.
              </Alert>
              <Typography variant="body2">
                User: <strong>{resetDialog.email}</strong>
              </Typography>
              <TextField label="Temporary password" value={resetDialog.tempPassword} fullWidth InputProps={{ readOnly: true }} />
              <Button
                variant="outlined"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resetDialog.tempPassword)
                  } catch {
                    // ignore
                  }
                }}
              >
                Copy to clipboard
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetDialog(null)}>Done</Button>
          </DialogActions>
        </Dialog>
      )}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Users</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => setShowCreateDialog(true)} disabled={saving}>
                Create user
              </Button>
              <Button onClick={loadUsers} disabled={loading || saving}>
                Refresh
              </Button>
            </Stack>
          </Stack>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 200 }}>Email</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Name</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Role</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>MFA</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Status</TableCell>
                    <TableCell align="right" sx={{ minWidth: 400 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => {
                    const isExpanded = expandedUserId === u.id
                    return (
                      <React.Fragment key={u.id}>
                        <TableRow
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => (isExpanded ? setExpandedUserId(null) : fetchRecoveryCodes(u.id))}
                        >
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.full_name}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} sx={{ py: 1 }}>
                            <TextField
                              select
                              size="small"
                              value={u.role}
                              onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                              sx={{ minWidth: 160 }}
                            >
                              {roleOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <Chip label={u.mfa_enabled ? 'Enabled' : 'Disabled'} color={u.mfa_enabled ? 'success' : 'default'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={u.is_active ? 'Active' : 'Disabled'} color={u.is_active ? 'success' : 'default'} size="small" />
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ py: 1 }}>
                            <Stack direction="row" spacing={1.5} justifyContent="flex-end" alignItems="center" flexWrap="wrap">
                              <Switch checked={u.is_active} onChange={(e) => updateUser(u.id, { is_active: e.target.checked })} size="small" />
                              <Button variant="outlined" size="small" onClick={() => resetPassword(u.id, u.email)} disabled={saving}>
                                Reset password
                              </Button>
                              <Button variant="outlined" size="small" onClick={() => resetMfa(u.id)} disabled={saving}>
                                Reset MFA
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Stack spacing={1}>
                              <Typography variant="subtitle2">Recovery codes</Typography>
                              {loadingCodes ? (
                                <Typography variant="body2" color="text.secondary">
                                  Loading...
                                </Typography>
                              ) : (
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                  {(recoveryCodes[u.id] || []).map((c) => (
                                    <Box key={c} sx={{ border: '1px solid #ddd', px: 1.5, py: 0.5, borderRadius: 1, fontFamily: 'monospace' }}>
                                      {c}
                                    </Box>
                                  ))}
                                  {(!recoveryCodes[u.id] || recoveryCodes[u.id].length === 0) && (
                                    <Typography variant="body2" color="text.secondary">
                                      No codes available.
                                    </Typography>
                                  )}
                                </Stack>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>{loading ? 'Loading...' : 'No users'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </Box>
          </CardContent>
        </Card>

      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              size="small"
              autoComplete="email"
            />
            <TextField
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              fullWidth
              size="small"
              autoComplete="new-password"
            />
            <TextField
              label="Role"
              select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              fullWidth
              size="small"
            >
              {roleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  size="small"
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={createUser} disabled={saving || loading}>
            {saving ? 'Creating...' : 'Create user'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}


