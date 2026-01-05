import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  MenuItem,
} from '@mui/material'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { CreateComplaintPayload, ReferenceItem } from '../types'

const steps = ['Complainant', 'Complaint', 'Policy']
const fcaCategories = [
  'Policy Administration',
  'Sales and Advice',
  'Pricing and Premiums',
  'Claims Handling',
  'Customer Service',
  'Cancellations and Refunds',
  'Disclosure and Documentation',
  'Vulnerability and Customer Treatment',
  'Data Protection and Privacy',
  'Third-Party / Supplier Issues',
  'Fraud or Financial Crime',
  'Other / Unclassified',
]

export default function CreateComplaintWizard() {
  const [activeStep, setActiveStep] = useState(0)
  const [payload, setPayload] = useState<CreateComplaintPayload>({
    source: 'Web',
    received_at: dayjs().toISOString(),
    description: '',
    category: fcaCategories[0],
    reason: '',
    fca_complaint: true,
    vulnerability_flag: false,
    complainant: { full_name: '' },
    policy: {},
  })
  const [channelFile, setChannelFile] = useState<File | null>(null)
  const [reference, setReference] = useState<{ products: ReferenceItem[]; insurers: ReferenceItem[]; brokers: ReferenceItem[] }>({
    products: [],
    insurers: [],
    brokers: [],
  })
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [products, insurers, brokers] = await Promise.all([
          api.get<ReferenceItem[]>('/reference/products'),
          api.get<ReferenceItem[]>('/reference/insurers'),
          api.get<ReferenceItem[]>('/reference/brokers'),
        ])
        setReference({ products: products.data, insurers: insurers.data, brokers: brokers.data })
      } catch (err) {
        // fail silently for now; keep manual entry available
      }
    }
    load()
  }, [])

  const update = (path: string, value: any) => {
    const segments = path.split('.')
    setPayload((prev) => {
      const copy: any = { ...prev }
      let current = copy
      segments.forEach((seg, idx) => {
        if (idx === segments.length - 1) current[seg] = value
        else {
          current[seg] = { ...current[seg] }
          current = current[seg]
        }
      })
      return copy
    })
  }

  const submit = async () => {
    if (payload.category === 'Other / Unclassified' && !(payload.reason && payload.reason.trim())) {
      alert('Please provide a justification when selecting "Other / Unclassified".')
      return
    }
    const res = await api.post('/complaints', payload)
    const id = res.data.id as string

    // If an attachment is provided, log initial communication with attachment
    // Map source to appropriate channel for communication
    if (channelFile) {
      const formData = new FormData()
      // Map source to communication channel (default to 'other' if not a standard channel)
      // Note: CommunicationChannel enum only supports: phone, email, letter, web, third_party, other
      const channelMap: Record<string, string> = {
        'Email': 'email',
        'Letter': 'letter',
        'Phone': 'phone',
        'Web': 'web',
        'In Person': 'other', // 'in_person' doesn't exist in enum, use 'other'
        'Other': 'other',
      }
      const channel = channelMap[payload.source] || 'other'
      formData.append('channel', channel)
      formData.append('direction', 'inbound')
      formData.append('summary', `Initial complaint via ${payload.source}${channelFile.name ? ` (with attachment: ${channelFile.name})` : ''}`)
      formData.append('occurred_at', payload.received_at)
      formData.append('is_final_response', 'false')
      formData.append('files', channelFile)
      try {
        await api.post(`/complaints/${id}/communications`, formData)
      } catch (err: any) {
        // Log error but continue - user can add communication manually if needed
        console.error('Failed to upload attachment during complaint creation', err)
        const errorMsg = err?.response?.data?.detail || err?.message || 'Unknown error'
        alert(`Complaint created successfully, but attachment upload failed: ${errorMsg}. You can add it manually in the Communications tab.`)
      }
    }

    navigate(`/complaints/${id}`, { state: { refreshDashboard: true } })
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Create complaint
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
        {steps.map((s) => (
          <Step key={s}>
            <StepLabel>{s}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Card>
        <CardContent>
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Full name"
                  fullWidth
                  value={payload.complainant.full_name}
                  onChange={(e) => update('complainant.full_name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  fullWidth
                  value={payload.complainant.email || ''}
                  onChange={(e) => update('complainant.email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={payload.complainant.phone || ''}
                  onChange={(e) => update('complainant.phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={payload.vulnerability_flag}
                      onChange={(e) => update('vulnerability_flag', e.target.checked)}
                    />
                  }
                  label="Vulnerable customer"
                />
              </Grid>
            </Grid>
          )}
          {activeStep === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Brief summary of the complaint"
                  value={payload.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Category (FCA-aligned)"
                  fullWidth
                  value={payload.category}
                  onChange={(e) => {
                    const value = e.target.value
                    update('category', value)
                    if (value === 'Vulnerability and Customer Treatment') {
                      update('vulnerability_flag', true)
                    }
                  }}
                  helperText="Choose one primary category"
                >
                  {fcaCategories.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Reason / sub-category"
                  fullWidth
                  multiline
                  minRows={2}
                  value={payload.reason || ''}
                  onChange={(e) => update('reason', e.target.value)}
                  helperText="Add specific reason(s); multiple allowed"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Channel"
                  fullWidth
                  value={payload.source}
                  onChange={(e) => update('source', e.target.value)}
                  helperText="How the complaint was received"
                >
                  {['Phone', 'Email', 'Letter', 'Web', 'In Person', 'Other'].map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Date complaint received"
                  type="date"
                  fullWidth
                  value={dayjs(payload.received_at).format('YYYY-MM-DD')}
                  onChange={(e) => update('received_at', dayjs(e.target.value).toISOString())}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label">
                  Attach file (PDF preferred)
                  <input
                    hidden
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                    onChange={(e) => setChannelFile(e.target.files?.[0] || null)}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {payload.source === 'Email' || payload.source === 'Letter'
                    ? `For emails/letters, please upload a PDF print (avoid .eml/.msg). Selected: ${channelFile?.name || 'none'}`
                    : `Upload supporting documents. Selected: ${channelFile?.name || 'none'}`}
                </Typography>
              </Grid>
            </Grid>
          )}
          {activeStep === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Policy number or Claim Reference"
                  fullWidth
                  value={payload.policy.policy_number || ''}
                  onChange={(e) => {
                    update('policy.policy_number', e.target.value)
                    update('policy_number', e.target.value)
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Product"
                  fullWidth
                  value={payload.policy.product || ''}
                  onChange={(e) => {
                    update('policy.product', e.target.value)
                    update('product', e.target.value)
                  }}
                  helperText="Select from reference data"
                >
                  <MenuItem value="">(None)</MenuItem>
                  {reference.products.map((p) => (
                    <MenuItem key={p.id} value={p.name}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Insurer"
                  fullWidth
                  value={payload.policy.insurer || ''}
                  onChange={(e) => {
                    update('policy.insurer', e.target.value)
                    update('insurer', e.target.value)
                  }}
                  helperText="Select from reference data"
                >
                  <MenuItem value="">(None)</MenuItem>
                  {reference.insurers.map((p) => (
                    <MenuItem key={p.id} value={p.name}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Broker"
                  fullWidth
                  value={payload.policy.broker || ''}
                  onChange={(e) => {
                    update('policy.broker', e.target.value)
                    update('broker', e.target.value)
                  }}
                  helperText="Select from reference data"
                >
                  <MenuItem value="">(None)</MenuItem>
                  {reference.brokers.map((p) => (
                    <MenuItem key={p.id} value={p.name}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
      <Box mt={2} display="flex" justifyContent="space-between">
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
          Back
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={() => setActiveStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={submit}>
            Submit
          </Button>
        )}
      </Box>
    </Box>
  )
}

