import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { TopBar } from '../components/layout'
import { Button, Input, Card, CardHeader, CardTitle, CardBody, Combobox } from '../components/ui'
import type { ReferenceItem } from '../types'

export default function CreateComplaintWizard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reference data
  const [products, setProducts] = useState<string[]>([])
  const [insurers, setInsurers] = useState<string[]>([])
  const [brokers, setBrokers] = useState<string[]>([])

  // Load reference data
  useEffect(() => {
    Promise.all([
      api.get<ReferenceItem[]>('/reference/products'),
      api.get<ReferenceItem[]>('/reference/insurers'),
      api.get<ReferenceItem[]>('/reference/brokers'),
    ])
      .then(([productsRes, insurersRes, brokersRes]) => {
        setProducts(productsRes.data.map((item) => item.name))
        setInsurers(insurersRes.data.map((item) => item.name))
        setBrokers(brokersRes.data.map((item) => item.name))
      })
      .catch((err) => {
        console.error('Failed to load reference data', err)
      })
  }, [])

  const [formData, setFormData] = useState({
    source: 'Email',
    received_at: dayjs().format('YYYY-MM-DDTHH:mm'),
    description: '',
    category: '',
    reason: '',
    vulnerability_flag: false,
    vulnerability_notes: '',
    // Policy fields
    policy_number: '',
    insurer: '',
    broker: '',
    product: '',
    scheme: '',
    // Complainant fields
    complainant_name: '',
    complainant_email: '',
    complainant_phone: '',
    complainant_address: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post('/complaints', {
        source: formData.source,
        received_at: dayjs(formData.received_at).toISOString(),
        description: formData.description,
        category: formData.category,
        reason: formData.reason || null,
        fca_complaint: true, // Always true unless marked non-reportable during handling
        fca_rationale: null,
        vulnerability_flag: formData.vulnerability_flag,
        vulnerability_notes: formData.vulnerability_notes || null,
        policy_number: formData.policy_number || null,
        insurer: formData.insurer || null,
        broker: formData.broker || null,
        product: formData.product || null,
        scheme: formData.scheme || null,
        complainant: {
          full_name: formData.complainant_name,
          email: formData.complainant_email || null,
          phone: formData.complainant_phone || null,
          address: formData.complainant_address || null,
        },
        policy: {
          policy_number: formData.policy_number || null,
          insurer: formData.insurer || null,
          broker: formData.broker || null,
          product: formData.product || null,
          scheme: formData.scheme || null,
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

      <div className="px-10 py-6 max-w-4xl">
        {error && (
          <div className="mb-6 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Receipt Information */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Information</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Source *</label>
                    <select
                      className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      required
                    >
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Letter">Letter</option>
                      <option value="Web Form">Web Form</option>
                      <option value="In Person">In Person</option>
                      <option value="Social Media">Social Media</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Date Received *</label>
                    <Input
                      type="datetime-local"
                      value={formData.received_at}
                      onChange={(e) => setFormData({ ...formData, received_at: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 2. Complainant Details */}
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
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Email</label>
                    <Input
                      type="email"
                      value={formData.complainant_email}
                      onChange={(e) =>
                        setFormData({ ...formData, complainant_email: e.target.value })
                      }
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Phone</label>
                    <Input
                      value={formData.complainant_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, complainant_phone: e.target.value })
                      }
                      placeholder="+44 20 1234 5678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-text-primary">Address</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={formData.complainant_address}
                    onChange={(e) => setFormData({ ...formData, complainant_address: e.target.value })}
                    placeholder="Full address..."
                  />
                </div>

                {/* Vulnerability */}
                <div className="pt-4 border-t border-border">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.vulnerability_flag}
                        onChange={() =>
                          setFormData({ ...formData, vulnerability_flag: !formData.vulnerability_flag })
                        }
                        className="h-4 w-4 rounded border-border text-brand focus:ring-2 focus:ring-brand/15"
                      />
                      <span className="text-sm font-medium text-text-primary">
                        Vulnerable Customer
                      </span>
                    </label>
                    {formData.vulnerability_flag && (
                      <div className="pl-7 space-y-2">
                        <label className="block text-xs font-medium text-text-primary">
                          Vulnerability Notes
                        </label>
                        <textarea
                          className="w-full min-h-[80px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                          value={formData.vulnerability_notes}
                          onChange={(e) =>
                            setFormData({ ...formData, vulnerability_notes: e.target.value })
                          }
                          placeholder="Details about vulnerability..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 3. Complaint Details */}
          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-text-primary">Description *</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the complaint..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Category *</label>
                    <select
                      className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select category...</option>
                      <option value="Claims">Claims</option>
                      <option value="Policy">Policy</option>
                      <option value="Service">Service</option>
                      <option value="Premium">Premium</option>
                      <option value="Communication">Communication</option>
                      <option value="Sales">Sales</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Reason</label>
                    <Input
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Specific reason..."
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 4. Policy Information */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Information</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Policy Number</label>
                    <Input
                      value={formData.policy_number}
                      onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                      placeholder="POL-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Product</label>
                    <Combobox
                      value={formData.product}
                      onChange={(value) => setFormData({ ...formData, product: value })}
                      options={products}
                      placeholder="Select or type product..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Insurer</label>
                    <Combobox
                      value={formData.insurer}
                      onChange={(value) => setFormData({ ...formData, insurer: value })}
                      options={insurers}
                      placeholder="Select or type insurer..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-primary">Broker</label>
                    <Combobox
                      value={formData.broker}
                      onChange={(value) => setFormData({ ...formData, broker: value })}
                      options={brokers}
                      placeholder="Select or type broker..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-text-primary">Scheme</label>
                  <Input
                    value={formData.scheme}
                    onChange={(e) => setFormData({ ...formData, scheme: e.target.value })}
                    placeholder="Scheme name..."
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 sticky bottom-6 bg-app/95 backdrop-blur-sm p-4 rounded-lg border border-border">
            <Button variant="secondary" onClick={() => navigate('/complaints')} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Complaint'
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
