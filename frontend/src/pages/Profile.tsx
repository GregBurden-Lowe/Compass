import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { TopBar } from '../components/layout'
import { Button, Input, Card, CardHeader, CardTitle, CardBody } from '../components/ui'
import { api } from '../api/client'

export default function Profile() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <>
      <TopBar title="Profile & Settings" />

      <div className="px-10 py-6 max-w-2xl">
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
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
