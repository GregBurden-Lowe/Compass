import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { TopBar } from '../components/layout'
import { Button, Input, Card, CardHeader, CardTitle, CardBody } from '../components/ui'

export default function CreateComplaintWizard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    category: '',
    reason: '',
    product: '',
    scheme: '',
    complainant_name: '',
    complainant_email: '',
    complainant_phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post('/complaints', {
        description: formData.description,
        category: formData.category,
        reason: formData.reason,
        product: formData.product,
        scheme: formData.scheme,
        complainant: {
          full_name: formData.complainant_name,
          email: formData.complainant_email,
          phone: formData.complainant_phone,
        },
      })

      navigate(`/complaints/${res.data.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create complaint')
      setLoading(false)
    }
  }

  return (
    <>
      <TopBar title="Create New Complaint" />

      <div className="px-10 py-6 max-w-3xl">
        {error && (
          <div className="mb-6 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complaint Information</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-text-primary">Description *</label>
                  <textarea
                    className="w-full min-h-[100px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Category</label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Reason</label>
                    <Input
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Product</label>
                    <Input
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Scheme</label>
                    <Input
                      value={formData.scheme}
                      onChange={(e) => setFormData({ ...formData, scheme: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complainant Details</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-text-primary">Full Name *</label>
                  <Input
                    value={formData.complainant_name}
                    onChange={(e) => setFormData({ ...formData, complainant_name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Email</label>
                    <Input
                      type="email"
                      value={formData.complainant_email}
                      onChange={(e) => setFormData({ ...formData, complainant_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Phone</label>
                    <Input
                      value={formData.complainant_phone}
                      onChange={(e) => setFormData({ ...formData, complainant_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/complaints')} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Complaint'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
