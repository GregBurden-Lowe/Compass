import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint, Communication } from '../types'
import { TopBar } from '../components/layout'
import { Button, Card, CardHeader, CardTitle, CardBody, Modal, ModalHeader, ModalBody, ModalFooter, Input } from '../components/ui'
import { StatusChip } from '../components/StatusChip'

type Tab = 'overview' | 'communications' | 'outcome' | 'history'

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Communication modal
  const [showCommModal, setShowCommModal] = useState(false)
  const [commForm, setCommForm] = useState({
    channel: 'Email',
    direction: 'Inbound',
    summary: '',
    occurred_at: dayjs().format('YYYY-MM-DDTHH:mm'),
    is_final_response: false,
  })
  const [commFiles, setCommFiles] = useState<FileList | null>(null)
  const [addingComm, setAddingComm] = useState(false)
  const [commError, setCommError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadComplaint()
  }, [id])

  const loadComplaint = () => {
    setLoading(true)
    api
      .get<Complaint>(`/complaints/${id}`)
      .then((res) => {
        setComplaint(res.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load complaint', err)
        setLoading(false)
      })
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
        channel: 'Email',
        direction: 'Inbound',
        summary: '',
        occurred_at: dayjs().format('YYYY-MM-DDTHH:mm'),
        is_final_response: false,
      })
      setCommFiles(null)
      loadComplaint()
    } catch (err: any) {
      setCommError(err?.response?.data?.detail || 'Failed to add communication')
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
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-text-primary mb-1">Handler</label>
                    <p className="text-sm text-text-primary">{complaint.assigned_handler_name || 'Unassigned'}</p>
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
                <CardTitle>Outcome</CardTitle>
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
                <CardTitle>Redress Payments</CardTitle>
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="mt-4 text-sm font-semibold text-text-primary">No redress payments</p>
                    <p className="mt-1 text-sm text-text-secondary">No redress payments have been recorded for this complaint</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardBody>
              {complaint.events && complaint.events.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {complaint.events.map((event) => (
                    <div key={event.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-text-primary">{event.event_type.replace('_', ' ')}</p>
                          <span className="text-xs text-text-muted">
                            {dayjs(event.created_at).format('MMM D, YYYY h:mm A')}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-text-secondary mt-1">{event.description}</p>
                        )}
                        {event.created_by_name && (
                          <p className="text-xs text-text-muted mt-1">by {event.created_by_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary mt-4">No history events recorded</p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

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
                <label className="block text-xs font-medium text-text-primary">Channel *</label>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  value={commForm.channel}
                  onChange={(e) => setCommForm({ ...commForm, channel: e.target.value })}
                >
                  <option value="Email">Email</option>
                  <option value="Phone">Phone</option>
                  <option value="Letter">Letter</option>
                  <option value="In Person">In Person</option>
                  <option value="Web Form">Web Form</option>
                  <option value="Social Media">Social Media</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">Direction *</label>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  value={commForm.direction}
                  onChange={(e) => setCommForm({ ...commForm, direction: e.target.value })}
                >
                  <option value="Inbound">Inbound</option>
                  <option value="Outbound">Outbound</option>
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
              <label className="block text-xs font-medium text-text-primary">Attachments</label>
              <input
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
