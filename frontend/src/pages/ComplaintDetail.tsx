import { useEffect, useState, ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint, Outcome, RedressPayment, ComplaintEvent, User } from '../types'
import { StatusChip } from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'

const redressOptions = [
  { value: 'financial_loss', label: 'Financial Loss (Direct Loss)' },
  { value: 'interest_on_financial_loss', label: 'Interest on Financial Loss' },
  { value: 'distress_and_inconvenience', label: 'Distress and Inconvenience' },
  { value: 'consequential_loss', label: 'Consequential Loss' },
  { value: 'premium_refund_adjustment', label: 'Premium Refund / Adjustment' },
  { value: 'goodwill_payment', label: 'Goodwill Payment' },
  { value: 'third_party_payment', label: 'Third-Party Payment' },
  { value: 'apology_or_explanation', label: 'Apology / Explanation (Non-monetary)' },
  { value: 'remedial_action', label: 'Remedial Action (Non-monetary)' },
]
const monetaryTypes = [
  'financial_loss',
  'interest_on_financial_loss',
  'distress_and_inconvenience',
  'consequential_loss',
  'premium_refund_adjustment',
  'goodwill_payment',
  'third_party_payment',
]

const apiBase =
  import.meta.env.VITE_API_BASE ||
  (() => {
    const origin = window.location.origin.replace(/:5173$/, '')
    return `${origin}:8000/api`
  })()
const attachmentBase = apiBase.replace(/\/api$/, '')
export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [tab, setTab] = useState(0)
  const { role, name, userId } = useAuth()
  const [channel, setChannel] = useState('email')
  const [direction, setDirection] = useState('outbound')
  const [summary, setSummary] = useState('')
  const [occurredAt, setOccurredAt] = useState(dayjs().format('YYYY-MM-DDTHH:mm'))
  const [files, setFiles] = useState<FileList | null>(null)
  const [saving, setSaving] = useState(false)
  const [isFinalResponse, setIsFinalResponse] = useState(false)
  const [outcomeValue, setOutcomeValue] = useState('upheld')
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [redressAmount, setRedressAmount] = useState<number | ''>('')
  const [redressType, setRedressType] = useState('goodwill_payment')
  const [redressStatus, setRedressStatus] = useState('pending')
  const [redressNotes, setRedressNotes] = useState('')
  const [redressRationale, setRedressRationale] = useState('')
  const [redressActionDesc, setRedressActionDesc] = useState('')
  const [redressActionStatus, setRedressActionStatus] = useState('not_started')
  const [redressApproved, setRedressApproved] = useState(false)
  const [savingRedress, setSavingRedress] = useState(false)
  const [editingRedressId, setEditingRedressId] = useState<string | null>(null)
  const [showReopenForm, setShowReopenForm] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [reopenDate, setReopenDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [reopening, setReopening] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [assignUserId, setAssignUserId] = useState<string>('')
  const [escalating, setEscalating] = useState(false)
  const [showEscalateDialog, setShowEscalateDialog] = useState(false)
  const [escalateManagerId, setEscalateManagerId] = useState<string>('')
  const [closingNonReportable, setClosingNonReportable] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [closingStandard, setClosingStandard] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeDialogType, setCloseDialogType] = useState<'standard' | 'non_reportable'>('standard')
  const [closeDate, setCloseDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [closeComment, setCloseComment] = useState('')
  const [closeError, setCloseError] = useState<string | null>(null)
  const isMonetaryType = monetaryTypes.includes(redressType)
  const redressLabel = (value: string) => redressOptions.find((o) => o.value === value)?.label || value
  const [events, setEvents] = useState<ComplaintEvent[]>([])
  const updateRedress = async (redressId: string, payload: any) => {
    if (!complaint) return
    await api.patch(`/complaints/${complaint.id}/redress/${redressId}`, payload)
    load()
  }

  const lastUpdated = complaint?.communications?.length
    ? complaint.communications
        .map((c) => c.occurred_at)
        .sort()
        .slice(-1)[0]
    : null

  const load = () => {
    api.get<Complaint>(`/complaints/${id}`).then((res) => setComplaint(res.data))
    api.get<ComplaintEvent[]>(`/complaints/${id}/events`).then((res) => setEvents(res.data))
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (role && role !== 'read_only') {
      api.get<User[]>('/users').then((res) => setUsers(res.data))
    }
  }, [role])

  const action = async (path: string) => {
    await api.post(`/complaints/${id}/${path}`)
    load()
  }

  const saveOutcome = async () => {
    if (!complaint) return
    setSavingOutcome(true)
    try {
      await api.post(`/complaints/${complaint.id}/outcome`, {
        outcome: outcomeValue,
        notes: outcomeNotes || null,
      })
      load()
    } finally {
      setSavingOutcome(false)
    }
  }

  const addRedress = async () => {
    if (!complaint) return
    const isMonetary = isMonetaryType
    if (isMonetary && redressAmount === '') return
    if (isMonetary && !redressRationale.trim()) return
    if (!isMonetary && !redressActionDesc.trim()) return
    setSavingRedress(true)
    try {
      await api.post(`/complaints/${complaint.id}/redress`, {
        amount: isMonetary ? Number(redressAmount) : null,
        payment_type: redressType,
        status: isMonetary ? redressStatus : 'pending',
        notes: redressNotes || null,
        outcome_id: complaint.outcome?.id ?? null,
        rationale: redressRationale || null,
        action_description: redressActionDesc || null,
        action_status: redressActionStatus,
        approved: isMonetary ? redressApproved : false,
      })
      setRedressAmount('')
      setRedressNotes('')
      setRedressType('goodwill_payment')
      setRedressStatus('pending')
      setRedressRationale('')
      setRedressActionDesc('')
      setRedressActionStatus('not_started')
      setRedressApproved(false)
      load()
    } finally {
      setSavingRedress(false)
    }
  }

  const addCommunication = async () => {
    if (!complaint || !summary) return
    if (isFinalResponse && !complaint.outcome) {
      // Frontend guard: final response requires outcome
      return
    }
    setSaving(true)
    const form = new FormData()
    form.append('channel', channel)
    form.append('direction', direction)
    form.append('summary', summary)
    form.append('occurred_at', new Date(occurredAt).toISOString())
    form.append('is_final_response', String(isFinalResponse))
    if (files) {
      Array.from(files).forEach((f) => form.append('files', f))
    }
    try {
      await api.post(`/complaints/${complaint.id}/communications`, form)
      setSummary('')
      setFiles(null)
      setOccurredAt(dayjs().format('YYYY-MM-DDTHH:mm'))
      setIsFinalResponse(false)
      load()
    } catch (err: any) {
      console.error('Failed to add communication', err)
      // Extract detailed error message from validation errors
      let errorMsg = 'Failed to add communication'
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail
        if (Array.isArray(detail)) {
          // Validation errors are an array of error objects
          const messages = detail.map((e: any) => {
            const field = e.loc?.join('.') || 'field'
            const msg = e.msg || 'validation error'
            return `${field}: ${msg}`
          })
          errorMsg = messages.join('\n')
        } else if (typeof detail === 'string') {
          errorMsg = detail
        } else {
          errorMsg = JSON.stringify(detail)
        }
      } else if (err?.message) {
        errorMsg = err.message
      }
      alert(`Error: ${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  const reopenComplaint = async () => {
    if (!complaint) return
    setReopening(true)
    try {
      await api.post(`/complaints/${complaint.id}/reopen`, {
        reason: reopenReason || null,
        reopened_at: reopenDate ? new Date(reopenDate).toISOString() : null,
      })
      setShowReopenForm(false)
      setReopenReason('')
      setReopenDate(dayjs().format('YYYY-MM-DD'))
      load()
    } finally {
      setReopening(false)
    }
  }

  const openEscalateDialog = () => {
    const managerOptions = users.filter((u) => u.role === 'complaints_manager')
    const defaultId =
      (complaint?.assigned_handler_id && managerOptions.some((m) => m.id === complaint.assigned_handler_id)
        ? complaint.assigned_handler_id
        : managerOptions[0]?.id) || ''
    setEscalateManagerId(defaultId)
    setShowEscalateDialog(true)
  }

  const confirmEscalation = async () => {
    if (!complaint || !escalateManagerId) return
    setEscalating(true)
    try {
      await api.post(`/complaints/${complaint.id}/escalate`, { manager_id: escalateManagerId })
      setShowEscalateDialog(false)
      load()
    } finally {
      setEscalating(false)
    }
  }

  const removeEscalation = async () => {
    if (!complaint) return
    setEscalating(true)
    try {
      await api.patch(`/complaints/${complaint.id}`, { is_escalated: false })
      load()
    } finally {
      setEscalating(false)
    }
  }

  const assignHandler = async () => {
    if (!assignUserId) return
    await api.post(`/complaints/${id}/assign`, null, { params: { handler_id: assignUserId } })
    setAssignUserId('')
    load()
  }

  const closeNonReportable = async () => {
    setClosingNonReportable(true)
    setCloseError(null)
    try {
      await api.post(`/complaints/${id}/close-non-reportable`, {
        closed_at: closeDate ? new Date(closeDate).toISOString() : null,
        comment: closeComment || null,
      })
      setCloseDialogOpen(false)
      setCloseComment('')
      load()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setCloseError(detail || 'Could not close as non-reportable')
    } finally {
      setClosingNonReportable(false)
    }
  }

  const closeStandard = async () => {
    setClosingStandard(true)
    setCloseError(null)
    try {
      await api.post(`/complaints/${id}/close`, {
        closed_at: closeDate ? new Date(closeDate).toISOString() : null,
        comment: closeComment || null,
      })
      setCloseDialogOpen(false)
      setCloseComment('')
      load()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setCloseError(detail || 'Could not close complaint')
    } finally {
      setClosingStandard(false)
    }
  }

  const openCloseDialog = (type: 'standard' | 'non_reportable') => {
    setCloseDialogType(type)
    setCloseDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await api.delete(`/complaints/${id}`)
      navigate('/complaints')
    } catch (err: any) {
      console.error('Failed to delete complaint', err)
      alert(err?.response?.data?.detail || 'Failed to delete complaint')
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (!complaint) return <Typography>Loading...</Typography>

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <div>
          <Typography variant="h5">{complaint.reference}</Typography>
          <Typography variant="subtitle1">{complaint.complainant.full_name}</Typography>
        </div>
        <StatusChip status={complaint.status} />
      </Stack>

      <Grid container spacing={2} mb={2}>
        <Grid item>
          <Chip label={`Product: ${complaint.product || 'n/a'}`} />
        </Grid>
        <Grid item>
          <Chip label={`Policy: ${complaint.policy_number || 'n/a'}`} />
        </Grid>
        {complaint.vulnerability_flag && (
          <Grid item>
            <Chip color="warning" label="Vulnerable" />
          </Grid>
        )}
      </Grid>

      <Stack direction="row" spacing={1} mb={2}>
        <Button variant="contained" size="small" disabled={role === 'read_only'} onClick={() => action('acknowledge')}>
          Acknowledge
        </Button>
        <Button variant="outlined" size="small" disabled={role === 'read_only'} onClick={() => action('investigate')}>
          Move to investigation
        </Button>
        <Button variant="outlined" size="small" disabled={role === 'read_only'} onClick={() => openCloseDialog('standard')}>
          Close
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="warning"
          disabled={role === 'read_only' || closingNonReportable}
          onClick={() => openCloseDialog('non_reportable')}
        >
          {closingNonReportable ? 'Closing...' : 'Close as non-reportable'}
        </Button>
        {complaint?.status === 'closed' && (
          <Button variant="outlined" size="small" disabled={role === 'read_only'} onClick={() => setShowReopenForm((v) => !v)}>
            Reopen
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          color="secondary"
          disabled={role === 'read_only' || escalating || users.filter((u) => u.role === 'complaints_manager').length === 0}
          onClick={openEscalateDialog}
        >
          {complaint.is_escalated ? 'Change escalation' : 'Escalate'}
        </Button>
        {complaint.is_escalated && (
          <Button variant="text" size="small" color="inherit" onClick={removeEscalation} disabled={role === 'read_only' || escalating}>
            Remove escalation
          </Button>
        )}
        {role === 'admin' && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { xs: 0, md: 2 } }}>
            <TextField
              select
              size="small"
              label="Assign handler"
              value={assignUserId || complaint.assigned_handler_id || ''}
              onChange={(e) => setAssignUserId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">(Unassigned)</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.full_name}
                  </MenuItem>
                ))}
            </TextField>
            <Button variant="contained" size="small" onClick={assignHandler} disabled={!assignUserId}>
              Assign
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const me = users.find((u) => u.full_name === name)
                if (me) {
                  setAssignUserId(me.id)
                  api.post(`/complaints/${id}/assign`, null, { params: { handler_id: me.id } }).then(load)
                }
              }}
              disabled={!users.length}
            >
              Assign to me
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete
            </Button>
          </Stack>
        )}
        {role === 'complaints_handler' && !complaint.assigned_handler_id && userId && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => api.post(`/complaints/${id}/assign`, null, { params: { handler_id: userId } }).then(load)}
          >
            Assign to me
          </Button>
        )}
      </Stack>
      {showReopenForm && complaint?.status === 'closed' && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2">Reopen complaint</Typography>
            <Typography variant="caption" color="text.secondary">
              Leave the date blank to use today&apos;s date.
            </Typography>
            <Grid container spacing={2} mt={1}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reason for reopen"
                  multiline
                  minRows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Reopen date"
                  type="date"
                  value={reopenDate}
                  onChange={(e) => setReopenDate(e.target.value)}
                  helperText="Blank = today"
                />
              </Grid>
              <Grid item xs={12} md={3} display="flex" alignItems="center">
                <Button variant="contained" onClick={reopenComplaint} disabled={reopening}>
                  {reopening ? 'Reopening...' : 'Confirm reopen'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Overview" />
        <Tab label="Communications" />
        <Tab label="Outcome / Redress" />
        <Tab label="History" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
                    Overview
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {complaint.reference} — {complaint.complainant.full_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Received {dayjs(complaint.received_at).format('DD MMM YYYY')} • Source {complaint.source || 'n/a'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StatusChip status={complaint.status} />
                  {complaint.vulnerability_flag && <Chip size="small" color="warning" label="Vulnerable" />}
                  {complaint.is_escalated && <Chip size="small" color="error" label="Escalated" />}
                  {complaint.ack_breached && <Chip size="small" color="error" label="Ack SLA breached" />}
                  {complaint.final_breached && <Chip size="small" color="error" label="Final SLA breached" />}
                </Stack>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb',
                      minHeight: 140,
                    }}
                  >
                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                      {complaint.description}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: '#0f4c81',
                      color: '#f8fafc',
                      height: '100%',
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="body1">
                        Ack due: {dayjs(complaint.ack_due_at).format('DD MMM YYYY')}
                      </Typography>
                      <Typography variant="body1">
                        Final due: {dayjs(complaint.final_due_at).format('DD MMM YYYY')}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.8)' }}>
                        Last updated: {lastUpdated ? dayjs(lastUpdated).format('DD MMM YYYY HH:mm') : 'No communications'}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Product
                    </Typography>
                    <Typography variant="body1">{complaint.product || 'n/a'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Policy
                    </Typography>
                    <Typography variant="body1">{complaint.policy_number || 'n/a'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Broker / Insurer
                    </Typography>
                    <Typography variant="body1">{complaint.broker || 'n/a'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {complaint.insurer || ''}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Category / Reason
                    </Typography>
                    <Typography variant="body1">
                      {complaint.category || 'n/a'}
                      {complaint.reason ? ` — ${complaint.reason}` : ''}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Stack spacing={2.5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Add communication
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    {[
                      { value: 'phone', label: 'Phone call' },
                      { value: 'email', label: 'Email' },
                      { value: 'letter', label: 'Letter' },
                      { value: 'web', label: 'Web' },
                      { value: 'third_party', label: 'Third party' },
                      { value: 'other', label: 'Other' },
                    ].map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Direction"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                  >
                    <MenuItem value="outbound">Outbound</MenuItem>
                    <MenuItem value="inbound">Inbound</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="When"
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6} display="flex" alignItems="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isFinalResponse}
                        onChange={(e) => setIsFinalResponse(e.target.checked)}
                        disabled={!complaint.outcome}
                      />
                    }
                    label="This is the final response"
                  />
                  {!complaint.outcome && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      Record an outcome first.
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6} display="flex" alignItems="center" justifyContent="flex-end">
                  <Button variant="outlined" component="label" size="small">
                    Attach files
                    <input
                      hidden
                      multiple
                      type="file"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFiles(e.target.files)}
                    />
                  </Button>
                  {files && files.length > 0 && (
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      {files.length} file(s) selected
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={addCommunication}
                    disabled={saving || !summary || (isFinalResponse && !complaint.outcome)}
                  >
                    {saving ? 'Saving...' : 'Add communication'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <List dense>
                {complaint.communications?.map((c) => (
                  <ListItem
                    key={c.id}
                    alignItems="flex-start"
                    sx={{ borderBottom: '1px solid #e5e7eb', py: 1.5, px: 2 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                      primary={`${c.direction} ${c.channel}`}
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.primary">
                            {c.summary}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(c.occurred_at).format('DD MMM YYYY HH:mm')}
                          </Typography>
                        </Stack>
                      }
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                      {c.is_final_response && <Chip size="small" color="success" label="Final response" />}
                      {c.attachments && c.attachments.length > 0 && (
                        <Stack direction="row" spacing={1}>
                          {c.attachments.map((a) => (
                            <Button
                              key={a.id}
                              size="small"
                              component="a"
                              href={`${attachmentBase}${a.url}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {a.file_name}
                            </Button>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </ListItem>
                ))}
                {(!complaint.communications || complaint.communications.length === 0) && (
                  <ListItem sx={{ py: 2, px: 2 }}>
                    <ListItemText primary="No communications recorded" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2.5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Outcome
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Outcome"
                    value={outcomeValue}
                    onChange={(e) => setOutcomeValue(e.target.value)}
                  >
                    {[
                      ['upheld', 'Upheld'],
                      ['partially_upheld', 'Partially upheld'],
                      ['not_upheld', 'Not upheld'],
                      ['withdrawn', 'Withdrawn'],
                      ['out_of_scope', 'Out of scope'],
                    ].map(([val, label]) => (
                      <MenuItem key={val} value={val}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Outcome notes"
                    multiline
                    minRows={3}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" size="small" onClick={saveOutcome} disabled={savingOutcome}>
                    {savingOutcome ? 'Saving...' : 'Save outcome'}
                  </Button>
                  {complaint.outcome && (
                    <Typography variant="body2" sx={{ ml: 2 }} component="span">
                      Current: {(complaint.outcome as Outcome).outcome}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Redress
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Redress type"
                    value={redressType}
                    onChange={(e) => setRedressType(e.target.value)}
                  >
                    {redressOptions.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {isMonetaryType && (
                  <Grid item xs={12} md={3}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Amount (monetary)"
                      value={redressAmount}
                      onChange={(e) => setRedressAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </Grid>
                )}
                {isMonetaryType && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Rationale (monetary)"
                      multiline
                      minRows={2}
                      value={redressRationale}
                      onChange={(e) => setRedressRationale(e.target.value)}
                      helperText="Required for monetary redress"
                    />
                  </Grid>
                )}
                {!isMonetaryType && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Action description (non-monetary)"
                      multiline
                      minRows={2}
                      value={redressActionDesc}
                      onChange={(e) => setRedressActionDesc(e.target.value)}
                      helperText="Required for non-monetary redress"
                    />
                  </Grid>
                )}
                {isMonetaryType && (
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      fullWidth
                      label="Status"
                      value={redressStatus}
                      onChange={(e) => setRedressStatus(e.target.value)}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="authorised">Authorised</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                    </TextField>
                  </Grid>
                )}
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Action status"
                    value={redressActionStatus}
                    onChange={(e) => setRedressActionStatus(e.target.value)}
                  >
                    <MenuItem value="not_started">Not Started</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    minRows={3}
                    value={redressNotes}
                    onChange={(e) => setRedressNotes(e.target.value)}
                  />
                </Grid>
                {isMonetaryType && (
                  <Grid item xs={12} md={3} display="flex" alignItems="center">
                    <FormControlLabel
                      control={<Checkbox checked={redressApproved} onChange={(e) => setRedressApproved(e.target.checked)} />}
                      label="Approved"
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={addRedress}
                    disabled={
                      savingRedress ||
                      (isMonetaryType && redressAmount === '') ||
                      (isMonetaryType && !redressRationale.trim()) ||
                      (!isMonetaryType && !redressActionDesc.trim())
                    }
                  >
                    {savingRedress ? 'Saving...' : 'Add redress'}
                  </Button>
                </Grid>
              </Grid>

              {complaint.redress_payments && complaint.redress_payments.length > 0 ? (
                <List dense sx={{ mt: 2 }}>
                  {complaint.redress_payments.map((r: RedressPayment) => (
                    <ListItem
                      key={r.id}
                      alignItems="flex-start"
                      onClick={() => setEditingRedressId(r.id)}
                      sx={{ borderBottom: '1px solid #e5e7eb', py: 1.5, px: 0, cursor: 'pointer' }}
                    >
                      {editingRedressId === r.id && (
                        <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', top: 8, right: 0 }}>
                          Tap to select status
                        </Typography>
                      )}
                      <ListItemText
                        primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={`${redressLabel(r.payment_type)}${r.amount ? ` • £${r.amount}` : ''}`}
                        secondary={
                          <Stack component="div" spacing={0.5} sx={{ mt: 0.5 }}>
                            {monetaryTypes.includes(r.payment_type) ? (
                              editingRedressId === r.id ? (
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                  <InputLabel>Status</InputLabel>
                                  <Select
                                    label="Status"
                                    value={r.status}
                                    onChange={async (e) => {
                                      await updateRedress(r.id, { status: e.target.value, approved: r.approved })
                                      setEditingRedressId(null)
                                    }}
                                  >
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="authorised">Authorised</MenuItem>
                                    <MenuItem value="paid">Paid</MenuItem>
                                  </Select>
                                </FormControl>
                              ) : (
                                <Typography component="span" variant="caption">
                                  Status: {r.status} (click to update)
                                </Typography>
                              )
                            ) : (
                              editingRedressId === r.id ? (
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                  <InputLabel>Action status</InputLabel>
                                  <Select
                                    label="Action status"
                                    value={r.action_status || 'not_started'}
                                    onChange={async (e) => {
                                      await updateRedress(r.id, { action_status: e.target.value })
                                      setEditingRedressId(null)
                                    }}
                                  >
                                    <MenuItem value="not_started">Not Started</MenuItem>
                                    <MenuItem value="in_progress">In Progress</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                  </Select>
                                </FormControl>
                              ) : (
                                <Typography component="span" variant="caption">
                                  Action: {r.action_description || 'n/a'} ({r.action_status || 'not_started'}) — click to update
                                </Typography>
                              )
                            )}
                            {r.approved && <Chip size="small" label="Approved" color="success" sx={{ maxWidth: 'fit-content' }} />}
                            {r.rationale && (
                              <Typography component="span" variant="caption" display="block">
                                Rationale: {r.rationale}
                              </Typography>
                            )}
                            {r.action_description && (
                              <Typography component="span" variant="caption" display="block">
                                Action: {r.action_description} ({r.action_status})
                              </Typography>
                            )}
                            {r.notes && (
                              <Typography component="span" variant="caption" display="block">
                                Notes: {r.notes}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" mt={2}>
                  No redress recorded
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 3 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              History / Audit trail
            </Typography>
            <List dense>
              {events.length === 0 && (
                <ListItem>
                  <ListItemText primary="No events recorded yet" />
                </ListItem>
              )}
              {events.map((ev) => {
                // Check if this event is about a communication and if we can find the related communication with attachments
                const isCommunicationEvent = ev.event_type === 'communication_added'
                const relatedComm = isCommunicationEvent && complaint?.communications?.find(
                  (c) => c.summary === ev.description || c.summary?.includes(ev.description?.substring(0, 50) || '')
                )
                const hasAttachments = relatedComm?.attachments && relatedComm.attachments.length > 0

                return (
                  <ListItem key={ev.id} sx={{ borderBottom: '1px solid #e5e7eb' }}>
                    <ListItemText
                      primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={ev.event_type.replace(/_/g, ' ')}
                      secondary={
                        <Stack spacing={0.5}>
                          {ev.description && <Typography variant="body2">{ev.description}</Typography>}
                          {hasAttachments && (
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Attachments:
                              </Typography>
                              {relatedComm.attachments.map((a) => (
                                <Button
                                  key={a.id}
                                  size="small"
                                  component="a"
                                  href={`${attachmentBase}${a.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  sx={{ minWidth: 'auto', p: 0.5, textTransform: 'none', fontSize: '0.75rem' }}
                                >
                                  {a.file_name}
                                </Button>
                              ))}
                            </Stack>
                          )}
                          {(ev.created_by_name || ev.created_by_id) && (
                            <Typography variant="caption" color="text.secondary">
                              {`By ${ev.created_by_name || ev.created_by_id}`}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(ev.created_at).format('DD MMM YYYY HH:mm')}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEscalateDialog} onClose={() => setShowEscalateDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Escalate to manager</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Manager"
              value={escalateManagerId}
              onChange={(e) => setEscalateManagerId(e.target.value)}
            >
              {users
                .filter((u) => u.role === 'complaints_manager')
                .map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.full_name}
                  </MenuItem>
                ))}
            </TextField>
            <Typography variant="body2" color="text.secondary">
              Selecting a manager will assign the complaint to them and mark it as escalated.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEscalateDialog(false)} disabled={escalating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmEscalation} disabled={escalating || !escalateManagerId}>
            {escalating ? 'Escalating...' : 'Confirm escalation'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{closeDialogType === 'non_reportable' ? 'Close as non-reportable' : 'Close complaint'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {closeError && (
              <Alert severity="error">
                {closeError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Closed date"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              helperText="Choose the effective closed date"
            />
            <TextField
              fullWidth
              label="Comments (optional)"
              multiline
              minRows={2}
              value={closeComment}
              onChange={(e) => setCloseComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={closeDialogType === 'non_reportable' ? closeNonReportable : closeStandard}
            disabled={closeDialogType === 'non_reportable' ? closingNonReportable : closingStandard}
          >
            {closeDialogType === 'non_reportable'
              ? closingNonReportable
                ? 'Closing...'
                : 'Confirm close (non-reportable)'
              : closingStandard
              ? 'Closing...'
              : 'Confirm close'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Complaint</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete this complaint? This action cannot be undone.
            All related data (communications, events, outcomes, redress payments, etc.) will also be deleted.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Complaint: {complaint?.reference}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

