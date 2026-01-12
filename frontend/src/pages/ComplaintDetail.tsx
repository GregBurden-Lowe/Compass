import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint, Communication, User, ComplaintEvent } from '../types'
import { TopBar } from '../components/layout'
import { Button, Card, CardHeader, CardTitle, CardBody, Modal, ModalHeader, ModalBody, ModalFooter, Input } from '../components/ui'
import { StatusChip } from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'

type Tab = 'overview' | 'communications' | 'outcome' | 'history'
type CloseAction = 'close' | 'close-non-reportable'

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [events, setEvents] = useState<ComplaintEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [users, setUsers] = useState<User[]>([])
  
  // Assignment state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  // Communication modal
  const [showCommModal, setShowCommModal] = useState(false)
  const [commForm, setCommForm] = useState({
    channel: 'email',
    direction: 'inbound',
    summary: '',
    occurred_at: dayjs().format('YYYY-MM-DDTHH:mm'),
    is_final_response: false,
  })
  const [commFiles, setCommFiles] = useState<FileList | null>(null)
  const [addingComm, setAddingComm] = useState(false)
  const [commError, setCommError] = useState<string | null>(null)
  
  // Outcome modal
  const [showOutcomeModal, setShowOutcomeModal] = useState(false)
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: 'upheld',
    notes: '',
  })
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [outcomeError, setOutcomeError] = useState<string | null>(null)
  
  // Redress modal
  const [showRedressModal, setShowRedressModal] = useState(false)
  const [redressForm, setRedressForm] = useState({
    payment_type: 'financial_loss',
    amount: '',
    status: 'pending',
    rationale: '',
    action_description: '',
    action_status: 'not_started',
    notes: '',
    approved: false,
  })
  const [savingRedress, setSavingRedress] = useState(false)
  const [redressError, setRedressError] = useState<string | null>(null)
  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeAction, setCloseAction] = useState<CloseAction | null>(null)
  const [closeDate, setCloseDate] = useState(dayjs().format('YYYY-MM-DDTHH:mm'))
  const [closing, setClosing] = useState(false)

  // FOS referral modal
  const [showFosModal, setShowFosModal] = useState(false)
  const [fosReference, setFosReference] = useState('')
  const [fosReferredAt, setFosReferredAt] = useState(dayjs().format('YYYY-MM-DDTHH:mm'))
  const [referringToFos, setReferringToFos] = useState(false)
  const [fosError, setFosError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadComplaint()
    loadUsers()
  }, [id])

  const loadEvents = () => {
    if (!id) return
    api
      .get<ComplaintEvent[]>(`/complaints/${id}/events`)
      .then((res) => setEvents(res.data))
      .catch((err) => console.error('Failed to load events', err))
  }

  const loadComplaint = () => {
    if (!id) return
    setLoading(true)
    api
      .get<Complaint>(`/complaints/${id}`)
      .then((res) => {
        setComplaint(res.data)
        loadEvents()
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load complaint', err)
        setLoading(false)
      })
  }

  const loadUsers = () => {
    // Fetch users for assignment dropdown
    api
      .get<User[]>('/users')
      .then((res) => {
        // Filter to active users who can handle complaints
        const handlers = res.data.filter(
          (u) => u.is_active && ['admin', 'complaints_handler', 'complaints_manager', 'reviewer'].includes(u.role)
        )
        setUsers(handlers)
      })
      .catch((err) => {
        console.error('Failed to load users', err)
      })
  }

  const handleAssignToMe = async () => {
    if (!id || !user) return

    setAssigning(true)
    setAssignError(null)
    try {
      await api.post(`/complaints/${id}/assign`, null, {
        params: { handler_id: user.id },
      })
      loadComplaint()
    } catch (err: any) {
      setAssignError(err?.response?.data?.detail || 'Failed to assign complaint')
    } finally {
      setAssigning(false)
    }
  }

  const handleAssignToUser = async () => {
    if (!id || !selectedUserId) return

    setAssigning(true)
    setAssignError(null)
    try {
      await api.post(`/complaints/${id}/assign`, null, {
        params: { handler_id: selectedUserId },
      })
      setShowAssignModal(false)
      setSelectedUserId('')
      loadComplaint()
    } catch (err: any) {
      setAssignError(err?.response?.data?.detail || 'Failed to assign complaint')
    } finally {
      setAssigning(false)
    }
  }

  const handleAddCommunication = async () => {
    if (!id || !commForm.summary) return

    setAddingComm(true)
    setCommError(null)

    try {
      const formData = new FormData()
      formData.append('channel', commForm.channel)
      formData.append('direction', commForm.direction)
      formData.append('summary', commForm.summary)
      formData.append('occurred_at', dayjs(commForm.occurred_at).toISOString())
      formData.append('is_final_response', commForm.is_final_response.toString())

      if (commFiles) {
        Array.from(commFiles).forEach((file) => {
          formData.append('files', file)
        })
      }

      await api.post(`/complaints/${id}/communications`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setShowCommModal(false)
      setCommForm({
        channel: 'email',
        direction: 'inbound',
        summary: '',
        occurred_at: dayjs().format('YYYY-MM-DDTHH:mm'),
        is_final_response: false,
      })
      setCommFiles(null)
      loadComplaint()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      let errorMessage = 'Failed to add communication'
      
      if (typeof detail === 'string') {
        errorMessage = detail
      } else if (Array.isArray(detail)) {
        // FastAPI validation errors are arrays of error objects
        errorMessage = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
      } else if (detail && typeof detail === 'object') {
        errorMessage = JSON.stringify(detail)
      }
      
      setCommError(errorMessage)
    } finally {
      setAddingComm(false)
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="Loading..." />
        <div className="px-10 py-6">
          <div className="text-center py-12 text-text-muted">Loading complaint details...</div>
        </div>
      </>
    )
  }

  if (!complaint) {
    return (
      <>
        <TopBar title="Not Found" />
        <div className="px-10 py-6">
          <div className="text-center py-12">
            <p className="text-sm font-semibold text-text-primary">Complaint not found</p>
            <Button variant="secondary" onClick={() => navigate('/complaints')} className="mt-4">
              Back to Complaints
            </Button>
          </div>
        </div>
      </>
    )
  }

  const handleStatusChange = async (endpoint: string, successMessage: string) => {
    if (!id) return

    try {
      await api.post(`/complaints/${id}/${endpoint}`)
      alert(successMessage)
      loadComplaint()
    } catch (err: any) {
      alert(err?.response?.data?.detail || `Failed to ${successMessage.toLowerCase()}`)
    }
  }

  const handleSaveOutcome = async () => {
    if (!id) return

    setSavingOutcome(true)
    setOutcomeError(null)
    try {
      await api.post(`/complaints/${id}/outcome`, {
        outcome: outcomeForm.outcome,
        notes: outcomeForm.notes || null,
      })
      setShowOutcomeModal(false)
      loadComplaint()
    } catch (err: any) {
      setOutcomeError(err?.response?.data?.detail || 'Failed to save outcome')
    } finally {
      setSavingOutcome(false)
    }
  }

  const handleAddRedress = async () => {
    if (!id) return

    setSavingRedress(true)
    setRedressError(null)
    try {
      await api.post(`/complaints/${id}/redress`, {
        payment_type: redressForm.payment_type,
        amount: redressForm.amount ? parseFloat(redressForm.amount) : null,
        status: redressForm.status,
        rationale: redressForm.rationale || null,
        action_description: redressForm.action_description || null,
        action_status: redressForm.action_status,
        notes: redressForm.notes || null,
        approved: redressForm.approved,
        outcome_id: complaint?.outcome?.id || null,
      })
      setShowRedressModal(false)
      setRedressForm({
        payment_type: 'financial_loss',
        amount: '',
        status: 'pending',
        rationale: '',
        action_description: '',
        action_status: 'not_started',
        notes: '',
        approved: false,
      })
      loadComplaint()
    } catch (err: any) {
      setRedressError(err?.response?.data?.detail || 'Failed to add redress')
    } finally {
      setSavingRedress(false)
    }
  }

  const openOutcomeModal = () => {
    if (complaint?.outcome) {
      setOutcomeForm({
        outcome: complaint.outcome.outcome,
        notes: complaint.outcome.notes || '',
      })
    } else {
      setOutcomeForm({
        outcome: 'upheld',
        notes: '',
      })
    }
    setOutcomeError(null)
    setShowOutcomeModal(true)
  }

  const openCloseModal = (action: CloseAction) => {
    setCloseAction(action)
    setCloseDate(dayjs().format('YYYY-MM-DDTHH:mm'))
    setShowCloseModal(true)
  }

  const handleSubmitClose = async () => {
    if (!id || !closeAction) return
    setClosing(true)
    try {
      await api.post(`/complaints/${id}/${closeAction}`, {
        closed_at: closeDate ? dayjs(closeDate).toISOString() : null,
      })
      setShowCloseModal(false)
      loadComplaint()
    } catch (err) {
      console.error('Failed to close complaint', err)
    } finally {
      setClosing(false)
    }
  }

  const openFosModal = () => {
    setFosError(null)
    setFosReference('')
    setFosReferredAt(dayjs().format('YYYY-MM-DDTHH:mm'))
    setShowFosModal(true)
  }

  const handleReferToFos = async () => {
    if (!id) return
    if (!fosReference.trim()) {
      setFosError('FOS reference is required')
      return
    }

    setReferringToFos(true)
    setFosError(null)
    try {
      await api.post(`/complaints/${id}/refer-to-fos`, {
        fos_reference: fosReference.trim(),
        fos_referred_at: fosReferredAt ? dayjs(fosReferredAt).toISOString() : null,
      })
      setShowFosModal(false)
      loadComplaint() // refresh complaint + events
    } catch (err: any) {
      setFosError(err?.response?.data?.detail || 'Failed to refer to FOS')
    } finally {
      setReferringToFos(false)
    }
  }

  return (
    <>
      <TopBar
        title={complaint.reference}
        actions={
          <div className="flex items-center gap-3">
            <StatusChip status={complaint.status} />
            <Button variant="secondary" onClick={() => navigate('/complaints')}>
              Back
            </Button>
          </div>
        }
      />

      <div className="px-10 py-6">
        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-1">
            {(['overview', 'communications', 'outcome', 'history'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition border-b-2 ${
                  activeTab === tab
                    ? 'border-brand text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Action Buttons */}
              {user?.role !== 'read_only' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {!complaint.acknowledged_at && (complaint.status === 'New' || complaint.status === 'Reopened') && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusChange('acknowledge', 'Complaint acknowledged')}
                        >
                          ✅ Acknowledge
                        </Button>
                      )}
                      
                      {(complaint.status === 'Acknowledged' || complaint.status === 'New' || complaint.status === 'Reopened') && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusChange('investigate', 'Investigation started')}
                        >
                          🔍 Start Investigation
                        </Button>
                      )}
                      
                      {complaint.status === 'In Investigation' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/complaints/${id}`)}
                        >
                          📝 Draft Response
                        </Button>
                      )}
                      
                      {complaint.outcome && !complaint.final_response_at && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusChange('final-response', 'Final response issued')}
                        >
                          📨 Issue Final Response
                        </Button>
                      )}
                      
                      {complaint.status !== 'Closed' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openCloseModal('close-non-reportable')}
                        >
                          🚫 Close as Non-Reportable
                        </Button>
                      )}
                      
                      {complaint.fos_complaint ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-semantic-info/10 text-semantic-info border border-semantic-info/20">
                          <span className="text-sm font-medium">🏛️ Referred to FOS</span>
                          {complaint.fos_reference && (
                            <span className="text-xs">({complaint.fos_reference})</span>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={openFosModal}
                        >
                          🏛️ Refer to Ombudsman
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Complaint Details</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
                      <p className="text-sm text-text-primary">{complaint.description || 'No description'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">Category</label>
                        <p className="text-sm text-text-primary">{complaint.category || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">Reason</label>
                        <p className="text-sm text-text-primary">{complaint.reason || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">Product</label>
                        <p className="text-sm text-text-primary">{complaint.product || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">Scheme</label>
                        <p className="text-sm text-text-primary">{complaint.scheme || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {complaint.complainant && (
                <Card>
                  <CardHeader>
                    <CardTitle>Complainant</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-2 mt-4">
                      <p className="text-sm text-text-primary font-medium">{complaint.complainant.full_name}</p>
                      {complaint.complainant.email && (
                        <p className="text-sm text-text-secondary">{complaint.complainant.email}</p>
                      )}
                      {complaint.complainant.phone && (
                        <p className="text-sm text-text-secondary">{complaint.complainant.phone}</p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1">Received</label>
                      <p className="text-sm text-text-primary">
                        {dayjs(complaint.received_at).format('MMM D, YYYY h:mm A')}
                      </p>
                    </div>
                    {complaint.acknowledged_at && (
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">Acknowledged</label>
                        <p className="text-sm text-text-primary">
                          {dayjs(complaint.acknowledged_at).format('MMM D, YYYY h:mm A')}
                        </p>
                      </div>
                    )}
                    {complaint.closed_at && (
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">Closed</label>
                        <p className="text-sm text-text-primary">
                          {dayjs(complaint.closed_at).format('MMM D, YYYY h:mm A')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assignment</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1">Current Handler</label>
                      <p className="text-sm text-text-primary font-semibold">
                        {complaint.assigned_handler_name || 'Unassigned'}
                      </p>
                    </div>
                    
                    {user?.role !== 'read_only' && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        {/* Assign to Me button - available to all except read_only */}
                        {(!complaint.assigned_handler_id || complaint.assigned_handler_id !== user?.id) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAssignToMe}
                            disabled={assigning}
                            className="w-full"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Assign to Me
                          </Button>
                        )}
                        
                        {/* Assign to Other button - only for admin/manager/reviewer */}
                        {(user?.role === 'admin' || user?.role === 'complaints_manager' || user?.role === 'reviewer') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowAssignModal(true)}
                            disabled={assigning}
                            className="w-full"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Assign to User
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* Communications Tab */}
        {activeTab === 'communications' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-text-primary">Communications</h2>
              <Button variant="primary" onClick={() => setShowCommModal(true)}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Communication
              </Button>
            </div>

            {complaint.communications && complaint.communications.length > 0 ? (
              <div className="space-y-4">
                {complaint.communications
                  .sort((a, b) => dayjs(b.occurred_at).valueOf() - dayjs(a.occurred_at).valueOf())
                  .map((comm: Communication) => (
                    <Card key={comm.id}>
                      <CardBody>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-app text-text-primary border border-border">
                              {comm.channel}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                                comm.direction === 'Inbound'
                                  ? 'bg-semantic-info/10 text-semantic-info'
                                  : 'bg-semantic-success/10 text-semantic-success'
                              }`}
                            >
                              {comm.direction}
                            </span>
                            {comm.is_final_response && (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-semantic-warning/10 text-semantic-warning border border-semantic-warning/20">
                                Final Response
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">
                            {dayjs(comm.occurred_at).format('MMM D, YYYY h:mm A')}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary mt-2">{comm.summary}</p>
                        {comm.attachments && comm.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {comm.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-app text-text-primary hover:bg-border text-xs transition"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {att.file_name}
                              </a>
                            ))}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 rounded-lg border border-border bg-surface">
                <svg
                  className="mx-auto h-12 w-12 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <p className="mt-4 text-sm font-semibold text-text-primary">No communications yet</p>
                <p className="mt-1 text-sm text-text-secondary">Click "Add Communication" to log your first interaction</p>
              </div>
            )}
          </div>
        )}

        {/* Outcome Tab */}
        {activeTab === 'outcome' && (
          <div className="space-y-6">
            {/* Outcome Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Outcome</CardTitle>
                  {user?.role !== 'read_only' && (
                    <Button variant="primary" size="sm" onClick={openOutcomeModal}>
                      {complaint.outcome ? 'Update Outcome' : 'Record Outcome'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                {complaint.outcome ? (
                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1">Outcome Type</label>
                      <p className="text-sm text-text-primary capitalize">
                        {complaint.outcome.outcome.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {complaint.outcome.notes && (
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">Notes</label>
                        <p className="text-sm text-text-secondary">{complaint.outcome.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary mt-4">No outcome recorded yet</p>
                )}
              </CardBody>
            </Card>

            {/* Redress Payments Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Redress Payments</CardTitle>
                  {user?.role !== 'read_only' && (
                    <Button variant="primary" size="sm" onClick={() => setShowRedressModal(true)}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Redress
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                {complaint.redress_payments && complaint.redress_payments.length > 0 ? (
                  <div className="space-y-4 mt-4">
                    {complaint.redress_payments.map((redress) => (
                      <div key={redress.id} className="p-4 rounded-lg border border-border bg-surface">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-text-primary capitalize">
                              {redress.payment_type.replace(/_/g, ' ')}
                            </p>
                            {redress.amount && (
                              <p className="text-lg font-bold text-text-primary mt-1">
                                £{redress.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                                redress.status === 'paid'
                                  ? 'bg-semantic-success/10 text-semantic-success'
                                  : redress.status === 'authorised'
                                  ? 'bg-semantic-warning/10 text-semantic-warning'
                                  : 'bg-app text-text-primary border border-border'
                              }`}
                            >
                              {redress.status.charAt(0).toUpperCase() + redress.status.slice(1)}
                            </span>
                            {redress.approved && (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-semantic-success/10 text-semantic-success border border-semantic-success/20">
                                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Approved
                              </span>
                            )}
                          </div>
                        </div>

                        {redress.rationale && (
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-text-primary mb-1">Rationale</label>
                            <p className="text-sm text-text-secondary">{redress.rationale}</p>
                          </div>
                        )}

                        {redress.action_description && (
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-text-primary mb-1">Action</label>
                            <div className="flex items-start justify-between">
                              <p className="text-sm text-text-secondary flex-1">{redress.action_description}</p>
                              {redress.action_status && (
                                <span
                                  className={`ml-3 inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                                    redress.action_status === 'completed'
                                      ? 'bg-semantic-success/10 text-semantic-success'
                                      : redress.action_status === 'in_progress'
                                      ? 'bg-semantic-info/10 text-semantic-info'
                                      : 'bg-app text-text-muted border border-border'
                                  }`}
                                >
                                  {redress.action_status.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {redress.notes && (
                          <div>
                            <label className="block text-xs font-medium text-text-primary mb-1">Notes</label>
                            <p className="text-sm text-text-secondary">{redress.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 mt-4">
                    <div className="mx-auto h-12 w-12 rounded-full border-2 border-text-muted flex items-center justify-center">
                      <span className="text-2xl font-bold text-text-muted">£</span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-text-primary">No redress payments</p>
                    <p className="mt-1 text-sm text-text-secondary">No redress payments have been recorded for this complaint</p>
                  </div>
                )}
              </CardBody>
            </Card>
            
            {/* Close Complaint Actions */}
            {user?.role !== 'read_only' && complaint.status !== 'Closed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Close Complaint</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {complaint.final_response_at && (
                      <Button
                        variant="primary"
                        onClick={() => openCloseModal('close')}
                      >
                        🔒 Close Complaint
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => openCloseModal('close-non-reportable')}
                    >
                      🚫 Close as Non-Reportable
                    </Button>
                  </div>
                  {!complaint.final_response_at && (
                    <p className="text-xs text-text-muted mt-3">
                      Note: Final response must be issued before closing the complaint normally.
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardBody>
              {events && events.length > 0 ? (
                <div className="space-y-0 mt-4">
                  {events
                    .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
                    .map((event) => {
                      const getEventIcon = (eventType: string) => {
                        if (eventType === 'created') return '📋'
                        if (eventType === 'accessed') return '👁️'
                        if (eventType === 'updated') return '✏️'
                        if (eventType === 'acknowledged') return '✅'
                        if (eventType === 'investigation_started') return '🔍'
                        if (eventType === 'response_drafted') return '📝'
                        if (eventType === 'outcome_recorded') return '⚖️'
                        if (eventType === 'final_response_issued') return '📨'
                        if (eventType === 'closed') return '🔒'
                        if (eventType === 'closed_non_reportable') return '🚫'
                        if (eventType === 'reopened') return '🔓'
                        if (eventType === 'escalated') return '⬆️'
                        if (eventType === 'assigned') return '👤'
                        if (eventType === 'referred_to_fos') return '🏛️'
                        if (eventType === 'communication_added') return '💬'
                        if (eventType === 'redress_added' || eventType === 'redress_updated') return '💰'
                        return '•'
                      }

                      const formatEventType = (eventType: string) => {
                        return eventType
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')
                      }

                      return (
                        <div key={event.id} className="flex gap-4 py-3 border-b border-border last:border-0 hover:bg-surface/50 transition px-3 -mx-3 rounded-lg">
                          <div className="flex-shrink-0 text-lg pt-0.5">
                            {getEventIcon(event.event_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-text-primary">
                                  {formatEventType(event.event_type)}
                                </p>
                                {event.description && (
                                  <p className="text-sm text-text-secondary mt-1">{event.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {event.created_by_name && (
                                    <span className="text-xs text-text-muted">
                                      by {event.created_by_name}
                                    </span>
                                  )}
                                  <span className="text-xs text-text-muted">
                                    {dayjs(event.created_at).format('MMM D, YYYY [at] h:mm A')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-12 mt-4">
                  <svg
                    className="mx-auto h-12 w-12 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="mt-4 text-sm font-semibold text-text-primary">No history events recorded</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Assign to User Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <ModalHeader onClose={() => setShowAssignModal(false)}>Assign Complaint</ModalHeader>
        <ModalBody>
          {assignError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {assignError}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="assign-handler" className="block text-xs font-medium text-text-primary">Select Handler *</label>
              <select
                id="assign-handler"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">-- Select a user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssignToUser}
            disabled={!selectedUserId || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Close Complaint Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)}>
        <ModalHeader onClose={() => setShowCloseModal(false)}>Confirm Closure</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Please confirm the closure date for this complaint.
            </p>
            <div className="space-y-2">
              <label htmlFor="close-date" className="block text-xs font-medium text-text-primary">
                Closure Date & Time *
              </label>
              <Input
                id="close-date"
                type="datetime-local"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitClose} disabled={closing || !closeDate}>
            {closing ? 'Closing...' : 'Confirm Closure'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Refer to FOS Modal */}
      <Modal open={showFosModal} onClose={() => setShowFosModal(false)}>
        <ModalHeader onClose={() => setShowFosModal(false)}>Refer to Ombudsman (FOS)</ModalHeader>
        <ModalBody>
          {fosError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {fosError}
            </div>
          )}
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Record the referral details. This can only be done once per complaint.
            </p>
            <div className="space-y-2">
              <label htmlFor="fos-reference" className="block text-xs font-medium text-text-primary">
                FOS Reference *
              </label>
              <Input
                id="fos-reference"
                value={fosReference}
                onChange={(e) => setFosReference(e.target.value)}
                placeholder="e.g. FOS-12345678"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="fos-date" className="block text-xs font-medium text-text-primary">
                Date Referred *
              </label>
              <Input
                id="fos-date"
                type="datetime-local"
                value={fosReferredAt}
                onChange={(e) => setFosReferredAt(e.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowFosModal(false)} disabled={referringToFos}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleReferToFos} disabled={referringToFos || !fosReference.trim()}>
            {referringToFos ? 'Referring...' : 'Confirm Referral'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Record Outcome Modal */}
      <Modal open={showOutcomeModal} onClose={() => setShowOutcomeModal(false)}>
        <ModalHeader onClose={() => setShowOutcomeModal(false)}>
          {complaint?.outcome ? 'Update Outcome' : 'Record Outcome'}
        </ModalHeader>
        <ModalBody>
          {outcomeError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {outcomeError}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="outcome-type" className="block text-xs font-medium text-text-primary">Outcome *</label>
              <select
                id="outcome-type"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={outcomeForm.outcome}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}
              >
                <option value="upheld">Upheld</option>
                <option value="partially_upheld">Partially Upheld</option>
                <option value="not_upheld">Not Upheld</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="out_of_scope">Out of Scope</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Notes</label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={outcomeForm.notes}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                placeholder="Add outcome notes..."
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowOutcomeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveOutcome} disabled={savingOutcome}>
            {savingOutcome ? 'Saving...' : 'Save Outcome'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Redress Modal */}
      <Modal open={showRedressModal} onClose={() => setShowRedressModal(false)}>
        <ModalHeader onClose={() => setShowRedressModal(false)}>Add Redress Payment</ModalHeader>
        <ModalBody>
          {redressError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {redressError}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="redress-type" className="block text-xs font-medium text-text-primary">Redress Type *</label>
              <select
                id="redress-type"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={redressForm.payment_type}
                onChange={(e) => setRedressForm({ ...redressForm, payment_type: e.target.value })}
              >
                <option value="financial_loss">Financial Loss</option>
                <option value="interest_on_financial_loss">Interest on Financial Loss</option>
                <option value="distress_and_inconvenience">Distress and Inconvenience</option>
                <option value="consequential_loss">Consequential Loss</option>
                <option value="premium_refund_adjustment">Premium Refund/Adjustment</option>
                <option value="goodwill_payment">Goodwill Payment</option>
                <option value="third_party_payment">Third Party Payment</option>
                <option value="apology_or_explanation">Apology or Explanation</option>
                <option value="remedial_action">Remedial Action</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Amount (£)</label>
              <Input
                type="number"
                step="0.01"
                value={redressForm.amount}
                onChange={(e) => setRedressForm({ ...redressForm, amount: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-text-muted">Leave blank for non-monetary redress</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="redress-status" className="block text-xs font-medium text-text-primary">Status *</label>
              <select
                id="redress-status"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={redressForm.status}
                onChange={(e) => setRedressForm({ ...redressForm, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="authorised">Authorised</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Rationale</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={redressForm.rationale}
                onChange={(e) => setRedressForm({ ...redressForm, rationale: e.target.value })}
                placeholder="Why is this redress being offered?"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Action Description</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={redressForm.action_description}
                onChange={(e) => setRedressForm({ ...redressForm, action_description: e.target.value })}
                placeholder="What action needs to be taken?"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="action-status" className="block text-xs font-medium text-text-primary">Action Status *</label>
              <select
                id="action-status"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={redressForm.action_status}
                onChange={(e) => setRedressForm({ ...redressForm, action_status: e.target.value })}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Notes</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={redressForm.notes}
                onChange={(e) => setRedressForm({ ...redressForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={redressForm.approved}
                onChange={() => setRedressForm({ ...redressForm, approved: !redressForm.approved })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-2 focus:ring-brand/15"
              />
              <span className="text-sm font-medium text-text-primary">Approved</span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowRedressModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddRedress} disabled={savingRedress}>
            {savingRedress ? 'Adding...' : 'Add Redress'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Communication Modal */}
      <Modal open={showCommModal} onClose={() => setShowCommModal(false)}>
        <ModalHeader onClose={() => setShowCommModal(false)}>Add Communication</ModalHeader>
        <ModalBody>
          {commError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {commError}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="comm-channel" className="block text-xs font-medium text-text-primary">Channel *</label>
                <select
                  id="comm-channel"
                  className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  value={commForm.channel}
                  onChange={(e) => setCommForm({ ...commForm, channel: e.target.value })}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="letter">Letter</option>
                  <option value="web">Web Form</option>
                  <option value="third_party">Third Party</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="comm-direction" className="block text-xs font-medium text-text-primary">Direction *</label>
                <select
                  id="comm-direction"
                  className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  value={commForm.direction}
                  onChange={(e) => setCommForm({ ...commForm, direction: e.target.value })}
                >
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Date & Time *</label>
              <Input
                type="datetime-local"
                value={commForm.occurred_at}
                onChange={(e) => setCommForm({ ...commForm, occurred_at: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Summary *</label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={commForm.summary}
                onChange={(e) => setCommForm({ ...commForm, summary: e.target.value })}
                placeholder="Describe the communication..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="comm-attachments" className="block text-xs font-medium text-text-primary">Attachments</label>
              <input
                id="comm-attachments"
                type="file"
                multiple
                onChange={(e) => setCommFiles(e.target.files)}
                className="w-full text-sm text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand file:text-white hover:file:opacity-90 cursor-pointer"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={commForm.is_final_response}
                onChange={() =>
                  setCommForm({ ...commForm, is_final_response: !commForm.is_final_response })
                }
                className="h-4 w-4 rounded border-border text-brand focus:ring-2 focus:ring-brand/15"
              />
              <span className="text-sm font-medium text-text-primary">Mark as Final Response</span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCommModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddCommunication}
            disabled={!commForm.summary || addingComm}
          >
            {addingComm ? 'Adding...' : 'Add Communication'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
