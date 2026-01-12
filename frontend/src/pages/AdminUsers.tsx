import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { User, UserRole } from '../types'
import { TopBar } from '../components/layout'
import { Button, Card, CardHeader, CardTitle, CardBody, Modal, ModalHeader, ModalBody, ModalFooter, Input, Table } from '../components/ui'
import dayjs from 'dayjs'

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [showResetMfaModal, setShowResetMfaModal] = useState(false)
  const [resetMfaUser, setResetMfaUser] = useState<User | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'complaints_handler' as UserRole,
    password: '',
    is_active: true,
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get<User[]>('/users')
      setUsers(res.data)
    } catch (err) {
      console.error('Failed to load users', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!formData.email || !formData.full_name || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await api.post('/users', formData)
      setShowCreateModal(false)
      resetForm()
      loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser || !formData.email || !formData.full_name) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await api.patch(`/users/${selectedUser.id}`, {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active,
        ...(formData.password ? { password: formData.password } : {}),
      })
      setShowEditModal(false)
      setSelectedUser(null)
      resetForm()
      loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return

    setSaving(true)
    setError(null)
    try {
      const res = await api.post(`/users/${selectedUser.id}/reset-password`)
      setTempPassword(res.data.temporary_password)
      loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password: '',
      is_active: user.is_active,
    })
    setError(null)
    setShowEditModal(true)
  }

  const openResetModal = (user: User) => {
    setSelectedUser(user)
    setTempPassword(null)
    setError(null)
    setShowResetModal(true)
  }

  const handleResetMfa = async (user: User) => {
    setMfaLoading(true)
    setError(null)
    try {
      await api.post(`/auth/mfa/reset/${user.id}`)
      loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reset MFA')
    } finally {
      setMfaLoading(false)
    }
  }

  const openResetMfaModal = (user: User) => {
    setResetMfaUser(user)
    setShowResetMfaModal(true)
  }

  const handleRegenerateRecovery = async (user: User) => {
    setMfaLoading(true)
    setError(null)
    setSelectedUser(user)
    try {
      const res = await api.post(`/auth/mfa/recovery/${user.id}/regenerate`)
      setRecoveryCodes(res.data.recovery_codes || [])
      setShowRecoveryModal(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to regenerate recovery codes')
    } finally {
      setMfaLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: 'complaints_handler',
      password: '',
      is_active: true,
    })
    setError(null)
  }

  const getRoleBadgeColor = (role: UserRole) => {
    if (role === 'admin') return 'bg-semantic-error/10 text-semantic-error'
    if (role === 'complaints_manager') return 'bg-semantic-warning/10 text-semantic-warning'
    if (role === 'reviewer') return 'bg-semantic-info/10 text-semantic-info'
    if (role === 'complaints_handler') return 'bg-semantic-success/10 text-semantic-success'
    return 'bg-app text-text-muted border border-border'
  }

  if (loading) {
    return (
      <>
        <TopBar title="User Management" />
        <div className="px-10 py-6">
          <div className="text-center py-12 text-text-muted">Loading users...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title="User Management"
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </Button>
        }
      />

      <div className="px-10 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mt-4">
              <Table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>MFA</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="font-semibold">{user.full_name}</td>
                      <td className="text-text-secondary">{user.email}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {user.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-semantic-success/10 text-semantic-success">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-app text-text-muted border border-border">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        {user.mfa_enabled ? (
                          <span className="text-semantic-success">✓ Enabled</span>
                        ) : (
                          <span className="text-text-muted">Disabled</span>
                        )}
                      </td>
                      <td className="text-text-secondary text-sm">
                        {dayjs(user.created_at).format('MMM D, YYYY')}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-brand hover:text-brand-dark text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openResetModal(user)}
                            className="text-semantic-warning hover:opacity-80 text-sm font-medium"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => openResetMfaModal(user)}
                            className="text-semantic-error hover:opacity-80 text-sm font-medium disabled:opacity-50"
                            disabled={mfaLoading}
                          >
                            Reset MFA
                          </button>
                          <button
                            onClick={() => handleRegenerateRecovery(user)}
                            className="text-text-secondary hover:text-text-primary text-sm font-medium disabled:opacity-50"
                            disabled={mfaLoading}
                          >
                            Recovery Codes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-text-secondary">No users found</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Create User Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalHeader onClose={() => setShowCreateModal(false)}>Create New User</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Full Name *</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="create-role" className="block text-xs font-medium text-text-primary">Role *</label>
              <select
                id="create-role"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value="complaints_handler">Complaints Handler</option>
                <option value="complaints_manager">Complaints Manager</option>
                <option value="reviewer">Reviewer</option>
                <option value="read_only">Read Only</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="create-password" className="block text-xs font-medium text-text-primary">Initial Password *</label>
              <Input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
              <p className="text-xs text-text-muted">User will be required to change this on first login</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-2 focus:ring-brand/15"
              />
              <span className="text-sm font-medium text-text-primary">Active</span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateUser} disabled={saving}>
            {saving ? 'Creating...' : 'Create User'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
        <ModalHeader onClose={() => setShowEditModal(false)}>Edit User</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Full Name *</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-role" className="block text-xs font-medium text-text-primary">Role *</label>
              <select
                id="edit-role"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value="complaints_handler">Complaints Handler</option>
                <option value="complaints_manager">Complaints Manager</option>
                <option value="reviewer">Reviewer</option>
                <option value="read_only">Read Only</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-password" className="block text-xs font-medium text-text-primary">New Password</label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-2 focus:ring-brand/15"
              />
              <span className="text-sm font-medium text-text-primary">Active</span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateUser} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* MFA Recovery Codes Modal */}
      <Modal open={showRecoveryModal} onClose={() => setShowRecoveryModal(false)}>
        <ModalHeader onClose={() => setShowRecoveryModal(false)}>Recovery Codes</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {error}
            </div>
          )}
          {recoveryCodes && recoveryCodes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Provide these codes to <strong className="text-text-primary">{selectedUser?.full_name}</strong>. Each code can be used once.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code) => (
                  <code
                    key={code}
                    className="text-sm font-mono bg-app border border-border rounded px-2 py-2 text-text-primary text-center"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                Users should store these codes securely. They can be used if the authenticator device is unavailable.
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No recovery codes generated.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={() => setShowRecoveryModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reset MFA Confirm Modal */}
      <Modal open={showResetMfaModal} onClose={() => setShowResetMfaModal(false)}>
        <ModalHeader onClose={() => setShowResetMfaModal(false)}>Reset MFA</ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Resetting MFA will disable MFA for this user and require re-enrollment.
            </p>
            <div className="rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 p-3 text-sm text-semantic-warning">
              User: <strong className="text-text-primary">{resetMfaUser?.full_name}</strong>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowResetMfaModal(false)} disabled={mfaLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (!resetMfaUser) return
              setShowResetMfaModal(false)
              await handleResetMfa(resetMfaUser)
            }}
            disabled={!resetMfaUser || mfaLoading}
          >
            {mfaLoading ? 'Resetting...' : 'Confirm Reset'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={showResetModal} onClose={() => setShowResetModal(false)}>
        <ModalHeader onClose={() => setShowResetModal(false)}>Reset Password</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {error}
            </div>
          )}
          {tempPassword ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-semantic-success/30 bg-semantic-success/5 p-4">
                <p className="text-sm font-semibold text-semantic-success mb-2">Password reset successful!</p>
                <p className="text-sm text-text-secondary mb-3">
                  Please provide this temporary password to <strong>{selectedUser?.full_name}</strong>:
                </p>
                <div className="rounded-lg bg-app border border-border p-3">
                  <code className="text-lg font-mono font-bold text-text-primary">{tempPassword}</code>
                </div>
                <p className="text-xs text-text-muted mt-3">
                  The user will be required to change this password on their next login.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Are you sure you want to reset the password for <strong className="text-text-primary">{selectedUser?.full_name}</strong>?
              </p>
              <p className="text-sm text-text-secondary">
                A temporary password will be generated that you can provide to the user. They will be required to change it on their next login.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {tempPassword ? (
            <Button variant="primary" onClick={() => setShowResetModal(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleResetPassword} disabled={saving}>
                {saving ? 'Resetting...' : 'Reset Password'}
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>
    </>
  )
}
