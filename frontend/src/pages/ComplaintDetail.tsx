import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Complaint } from '../types'
import { TopBar } from '../components/layout'
import { Button, Card, CardHeader, CardTitle, CardBody } from '../components/ui'
import { StatusChip } from '../components/StatusChip'
import dayjs from 'dayjs'

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

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
  }, [id])

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
                    <p className="text-sm text-text-secondary">{complaint.complainant.email}</p>
                    <p className="text-sm text-text-secondary">{complaint.complainant.phone}</p>
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
      </div>
    </>
  )
}
