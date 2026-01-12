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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
    complainant_dob: '',
  })

  // Track changes for unsaved warning
  useEffect(() => {
    const hasData = !!(formData.complainant_name || formData.description || formData.category)
    setHasUnsavedChanges(hasData)
  }, [formData])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        document.getElementById('submit-btn')?.click()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const validateEmail = (email: string) => {
    if (!email) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
    // Clear validation error for this field
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors }
      delete newErrors[field]
      setValidationErrors(newErrors)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return
      }
    }
    navigate('/complaints')
  }

  const setToNow = () => {
    setFormData({ ...formData, received_at: dayjs().format('YYYY-MM-DDTHH:mm') })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors({})
    
    // Client-side validation
    const errors: Record<string, string> = {}
    if (!formData.complainant_name.trim()) {
      errors.complainant_name = 'Full name is required'
    }
    if (formData.complainant_email && !validateEmail(formData.complainant_email)) {
      errors.complainant_email = 'Invalid email format'
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    }
    if (!formData.category) {
      errors.category = 'Category is required'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setError('Please fix the validation errors before submitting')
      return
    }

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
          date_of_birth: formData.complainant_dob || null,
        },
        policy: {
          policy_number: formData.policy_number || null,
          insurer: formData.insurer || null,
          broker: formData.broker || null,
          product: formData.product || null,
          scheme: formData.scheme || null,
        },
      })

      setHasUnsavedChanges(false)
      navigate(`/complaints/${res.data.id}`, { 
        state: { message: 'Complaint created successfully!' } 
      })
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create complaint')
      setLoading(false)
    }
  }

  const getCharacterCount = (text: string, max: number) => {
    const remaining = max - text.length
    const isNearLimit = remaining <= 50
    const isOverLimit = remaining < 0
    return (
      <span className={`text-xs ${
        isOverLimit ? 'text-semantic-error' : 
        isNearLimit ? 'text-semantic-warning' : 
        'text-text-muted'
      }`}>
        {text.length} / {max}
      </span>
    )
  }

  return (
    <>
      <TopBar 
        title="Create New Complaint"
        actions={
          <div className="flex items-center gap-4">
            {hasUnsavedChanges && (
              <span className="text-xs text-text-muted">Unsaved changes</span>
            )}
            <Button variant="secondary" onClick={handleCancel} type="button">
              Cancel
            </Button>
          </div>
        }
      />

      <div className="px-10 py-6 max-w-4xl">
        {error && (
          <div className="mb-6 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
            {error}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-6 bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
            <span>Complaint Creation Form</span>
            <span className="text-text-muted">Tip: Press Cmd/Ctrl + S to submit</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-1 bg-brand rounded-full" title="Receipt Information" />
            <div className="flex-1 h-1 bg-brand rounded-full" title="Complainant Details" />
            <div className="flex-1 h-1 bg-brand rounded-full" title="Complaint Details" />
            <div className="flex-1 h-1 bg-brand rounded-full" title="Policy Information" />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-2">
            <span>Receipt</span>
            <span>Complainant</span>
            <span>Complaint</span>
            <span>Policy</span>
          </div>
        </div>

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
                    <label htmlFor="source" className="block text-xs font-medium text-text-primary">
                      Source *
                    </label>
                    <select
                      id="source"
                      className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                      value={formData.source}
                      onChange={(e) => handleFieldChange('source', e.target.value)}
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
                    <div className="flex items-center justify-between">
                      <label htmlFor="received_at" className="block text-xs font-medium text-text-primary">
                        Date Received *
                      </label>
                      <button
                        type="button"
                        onClick={setToNow}
                        className="text-xs text-brand hover:text-brand-dark font-medium"
                      >
                        Set to Now
                      </button>
                    </div>
                    <Input
                      id="received_at"
                      type="datetime-local"
                      value={formData.received_at}
                      onChange={(e) => handleFieldChange('received_at', e.target.value)}
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
                  <label htmlFor="complainant_name" className="block text-xs font-medium text-text-primary">
                    Full Name *
                  </label>
                  <Input
                    id="complainant_name"
                    value={formData.complainant_name}
                    onChange={(e) => handleFieldChange('complainant_name', e.target.value)}
                    placeholder="John Doe"
                    required
                    className={validationErrors.complainant_name ? 'border-semantic-error' : ''}
                  />
                  {validationErrors.complainant_name && (
                    <p className="text-xs text-semantic-error">{validationErrors.complainant_name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="complainant_email" className="block text-xs font-medium text-text-primary">
                      Email
                    </label>
                    <Input
                      id="complainant_email"
                      type="email"
                      value={formData.complainant_email}
                      onChange={(e) => handleFieldChange('complainant_email', e.target.value)}
                      placeholder="john@example.com"
                      className={validationErrors.complainant_email ? 'border-semantic-error' : ''}
                    />
                    {validationErrors.complainant_email && (
                      <p className="text-xs text-semantic-error">{validationErrors.complainant_email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="complainant_phone" className="block text-xs font-medium text-text-primary">
                      Phone
                    </label>
                    <Input
                      id="complainant_phone"
                      value={formData.complainant_phone}
                      onChange={(e) => handleFieldChange('complainant_phone', e.target.value)}
                      placeholder="+44 20 1234 5678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="complainant_dob" className="block text-xs font-medium text-text-primary">
                      Date of Birth
                      <span className="text-text-muted font-normal ml-1">(for verification)</span>
                    </label>
                    <Input
                      id="complainant_dob"
                      type="date"
                      value={formData.complainant_dob}
                      onChange={(e) => handleFieldChange('complainant_dob', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="complainant_address" className="block text-xs font-medium text-text-primary">
                      Address
                    </label>
                    <Input
                      id="complainant_address"
                      value={formData.complainant_address}
                      onChange={(e) => handleFieldChange('complainant_address', e.target.value)}
                      placeholder="Full address..."
                    />
                  </div>
                </div>

                {/* Vulnerability */}
                <div className="pt-4 border-t border-border">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        id="vulnerability_flag"
                        type="checkbox"
                        checked={formData.vulnerability_flag}
                        onChange={() =>
                          handleFieldChange('vulnerability_flag', !formData.vulnerability_flag)
                        }
                        className="h-4 w-4 rounded border-border text-brand focus:ring-2 focus:ring-brand/15"
                      />
                      <span className="text-sm font-medium text-text-primary">
                        Vulnerable Customer
                      </span>
                    </label>
                    {formData.vulnerability_flag && (
                      <div className="pl-7 space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="vulnerability_notes" className="block text-xs font-medium text-text-primary">
                            Vulnerability Notes
                          </label>
                          {getCharacterCount(formData.vulnerability_notes, 500)}
                        </div>
                        <textarea
                          id="vulnerability_notes"
                          className="w-full min-h-[80px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                          value={formData.vulnerability_notes}
                          onChange={(e) => handleFieldChange('vulnerability_notes', e.target.value)}
                          placeholder="Details about vulnerability..."
                          maxLength={500}
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
                  <div className="flex items-center justify-between">
                    <label htmlFor="description" className="block text-xs font-medium text-text-primary">
                      Description *
                    </label>
                    {getCharacterCount(formData.description, 2000)}
                  </div>
                  <textarea
                    id="description"
                    className={`w-full min-h-[120px] rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 ${
                      validationErrors.description ? 'border-semantic-error' : 'border-border'
                    }`}
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Detailed description of the complaint..."
                    maxLength={2000}
                    required
                  />
                  {validationErrors.description && (
                    <p className="text-xs text-semantic-error">{validationErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="category" className="block text-xs font-medium text-text-primary">
                      Category *
                    </label>
                    <select
                      id="category"
                      className={`w-full h-10 rounded-lg border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 ${
                        validationErrors.category ? 'border-semantic-error' : 'border-border'
                      }`}
                      value={formData.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
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
                    {validationErrors.category && (
                      <p className="text-xs text-semantic-error">{validationErrors.category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="reason" className="block text-xs font-medium text-text-primary">
                      Reason
                      <span className="text-text-muted font-normal ml-1">(optional)</span>
                    </label>
                    <Input
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => handleFieldChange('reason', e.target.value)}
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
                    <label htmlFor="policy_number" className="block text-xs font-medium text-text-primary">
                      Policy Number
                      <span className="text-text-muted font-normal ml-1">(if known)</span>
                    </label>
                    <Input
                      id="policy_number"
                      value={formData.policy_number}
                      onChange={(e) => handleFieldChange('policy_number', e.target.value)}
                      placeholder="POL-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="product" className="block text-xs font-medium text-text-primary">
                      Product
                    </label>
                    <Combobox
                      value={formData.product}
                      onChange={(value) => handleFieldChange('product', value)}
                      options={products}
                      placeholder="Select or type product..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="insurer" className="block text-xs font-medium text-text-primary">
                      Insurer
                    </label>
                    <Combobox
                      value={formData.insurer}
                      onChange={(value) => handleFieldChange('insurer', value)}
                      options={insurers}
                      placeholder="Select or type insurer..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="broker" className="block text-xs font-medium text-text-primary">
                      Broker
                    </label>
                    <Combobox
                      value={formData.broker}
                      onChange={(value) => handleFieldChange('broker', value)}
                      options={brokers}
                      placeholder="Select or type broker..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="scheme" className="block text-xs font-medium text-text-primary">
                    Scheme
                  </label>
                  <Input
                    id="scheme"
                    value={formData.scheme}
                    onChange={(e) => handleFieldChange('scheme', e.target.value)}
                    placeholder="Scheme name..."
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 sticky bottom-6 bg-app/95 backdrop-blur-sm p-4 rounded-lg border border-border shadow-lg">
            <Button variant="secondary" onClick={handleCancel} type="button">
              Cancel
            </Button>
            <Button id="submit-btn" variant="primary" type="submit" disabled={loading}>
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
