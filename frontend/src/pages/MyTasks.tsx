import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { api } from '../api/client'
import { Complaint } from '../types'
import { TopBar } from '../components/layout'
import { Button, Card, CardHeader, CardTitle, CardBody } from '../components/ui'
import { StatusChip } from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'

dayjs.extend(relativeTime)

interface TaskGroup {
  title: string
  description: string
  icon: string
  colorClass: string
  bgColorClass: string
  textColorClass: string
  complaints: Complaint[]
}

export default function MyTasks() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskGroup[]>([])

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    if (!user?.id) return
    
    setLoading(true)
    setError(null)
    try {
      // Fetch complaints assigned to current user efficiently
      const res = await api.get<Complaint[]>('/complaints', {
        params: { handler_id: user.id, page: 1, page_size: 100, _: Date.now() },
      })
      const myComplaints = res.data.filter((c) => c.status !== 'Closed')

      // Group tasks by what needs to be done
      const acknowledgementsDue = myComplaints.filter(
        (c) =>
          (c.status === 'New' || c.status === 'Reopened') &&
          !c.acknowledged_at &&
          c.ack_due_at &&
          dayjs(c.ack_due_at).isAfter(dayjs())
      )

      const acknowledgementsOverdue = myComplaints.filter(
        (c) =>
          (c.status === 'New' || c.status === 'Reopened') &&
          !c.acknowledged_at &&
          c.ack_due_at &&
          dayjs(c.ack_due_at).isBefore(dayjs())
      )

      const inInvestigation = myComplaints.filter(
        (c) => c.status === 'Investigating' || c.status === 'Acknowledged'
      )

      const finalResponsesDue = myComplaints.filter(
        (c) =>
          c.status === 'Response Drafted' &&
          !c.final_response_at &&
          c.final_due_at &&
          dayjs(c.final_due_at).isAfter(dayjs())
      )

      const finalResponsesOverdue = myComplaints.filter(
        (c) =>
          (c.status === 'Response Drafted' ||
            c.status === 'Investigating' ||
            c.status === 'Acknowledged') &&
          !c.final_response_at &&
          c.final_due_at &&
          dayjs(c.final_due_at).isBefore(dayjs())
      )

      const taskGroups: TaskGroup[] = []

      if (acknowledgementsOverdue.length > 0) {
        taskGroups.push({
          title: 'Acknowledgements Overdue',
          description: 'These complaints need acknowledgement urgently',
          icon: '🚨',
          colorClass: 'semantic-error',
          bgColorClass: 'bg-semantic-error/10',
          textColorClass: 'text-semantic-error',
          complaints: acknowledgementsOverdue.sort(
            (a, b) => dayjs(a.ack_due_at).valueOf() - dayjs(b.ack_due_at).valueOf()
          ),
        })
      }

      if (acknowledgementsDue.length > 0) {
        taskGroups.push({
          title: 'Acknowledgements Due',
          description: 'These complaints need acknowledgement soon',
          icon: '⏰',
          colorClass: 'semantic-warning',
          bgColorClass: 'bg-semantic-warning/10',
          textColorClass: 'text-semantic-warning',
          complaints: acknowledgementsDue.sort(
            (a, b) => dayjs(a.ack_due_at).valueOf() - dayjs(b.ack_due_at).valueOf()
          ),
        })
      }

      if (finalResponsesOverdue.length > 0) {
        taskGroups.push({
          title: 'Final Responses Overdue',
          description: 'These complaints need final response urgently',
          icon: '🚨',
          colorClass: 'semantic-error',
          bgColorClass: 'bg-semantic-error/10',
          textColorClass: 'text-semantic-error',
          complaints: finalResponsesOverdue.sort(
            (a, b) => dayjs(a.final_due_at).valueOf() - dayjs(b.final_due_at).valueOf()
          ),
        })
      }

      if (finalResponsesDue.length > 0) {
        taskGroups.push({
          title: 'Final Responses Due',
          description: 'These complaints are ready for final response',
          icon: '📨',
          colorClass: 'semantic-info',
          bgColorClass: 'bg-semantic-info/10',
          textColorClass: 'text-semantic-info',
          complaints: finalResponsesDue.sort(
            (a, b) => dayjs(a.final_due_at).valueOf() - dayjs(b.final_due_at).valueOf()
          ),
        })
      }

      if (inInvestigation.length > 0) {
        taskGroups.push({
          title: 'In Investigation',
          description: 'These complaints are actively being worked on',
          icon: '🔍',
          colorClass: 'brand',
          bgColorClass: 'bg-brand/10',
          textColorClass: 'text-brand',
          complaints: inInvestigation.sort(
            (a, b) => dayjs(a.received_at).valueOf() - dayjs(b.received_at).valueOf()
          ),
        })
      }

      setTasks(taskGroups)
    } catch (err: any) {
      console.error('Failed to load tasks', err)
      setError('Failed to load your tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRelativeTime = (date: string | null | undefined) => {
    if (!date) return ''
    const now = dayjs()
    const target = dayjs(date)
    
    if (target.isBefore(now)) {
      return `${dayjs().to(target)} overdue`
    } else {
      return `due ${dayjs().to(target)}`
    }
  }

  const handleQuickAcknowledge = async (complaintId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.post(`/complaints/${complaintId}/acknowledge`)
      loadTasks() // Reload tasks
    } catch (err) {
      console.error('Failed to acknowledge', err)
      alert('Failed to acknowledge complaint')
    }
  }

  const getTotalTasks = () => {
    return tasks.reduce((sum, group) => sum + group.complaints.length, 0)
  }

  const getUrgentCount = () => {
    return tasks
      .filter((g) => g.title.includes('Overdue'))
      .reduce((sum, group) => sum + group.complaints.length, 0)
  }

  if (loading) {
    return (
      <>
        <TopBar 
          title="My Tasks"
          actions={
            <Button variant="secondary" onClick={loadTasks} disabled={loading}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          }
        />
        <div className="px-10 py-6">
          <div className="text-center py-12 text-text-muted">Loading your tasks...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar 
        title="My Tasks"
        actions={
          <Button variant="secondary" onClick={loadTasks} disabled={loading}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <div className="px-10 py-6">
        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-4 flex items-center justify-between">
            <span className="text-sm text-semantic-error">{error}</span>
            <Button variant="secondary" onClick={loadTasks}>
              Retry
            </Button>
          </div>
        )}

        {/* Summary with KPIs */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Your Work List</h2>
              <p className="text-sm text-text-secondary mt-1">
                {getTotalTasks() === 0 
                  ? "You're all caught up!"
                  : `You have ${getTotalTasks()} ${getTotalTasks() === 1 ? 'task' : 'tasks'} requiring attention`
                }
              </p>
            </div>
          </div>

          {/* Quick stats */}
          {getTotalTasks() > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-app p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-text-secondary">Total Tasks</div>
                    <div className="text-2xl font-bold text-text-primary mt-1">{getTotalTasks()}</div>
                  </div>
                  <div className="text-3xl">📋</div>
                </div>
              </div>
              <div className="rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-semantic-error">Urgent (Overdue)</div>
                    <div className="text-2xl font-bold text-semantic-error mt-1">{getUrgentCount()}</div>
                  </div>
                  <div className="text-3xl">🚨</div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-app p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-text-secondary">In Progress</div>
                    <div className="text-2xl font-bold text-text-primary mt-1">
                      {tasks.find((t) => t.title === 'In Investigation')?.complaints.length || 0}
                    </div>
                  </div>
                  <div className="text-3xl">🔍</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-16 w-16 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4 text-lg font-semibold text-text-primary">All caught up!</p>
                <p className="mt-2 text-sm text-text-secondary">
                  You don't have any tasks requiring immediate attention.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {tasks.map((taskGroup, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{taskGroup.icon}</span>
                    <div className="flex-1">
                      <CardTitle>{taskGroup.title}</CardTitle>
                      <p className="text-sm text-text-secondary mt-1">{taskGroup.description}</p>
                    </div>
                    <span
                      className={`inline-flex items-center justify-center h-8 min-w-8 rounded-full ${taskGroup.bgColorClass} ${taskGroup.textColorClass} px-2 text-sm font-bold`}
                    >
                      {taskGroup.complaints.length}
                    </span>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3 mt-4">
                    {taskGroup.complaints.map((complaint) => {
                      const isAckTask = taskGroup.title.includes('Acknowledgement')
                      const isFinalTask = taskGroup.title.includes('Final Response')
                      const relevantDate = isAckTask ? complaint.ack_due_at : isFinalTask ? complaint.final_due_at : null
                      const isOverdue = relevantDate ? dayjs(relevantDate).isBefore(dayjs()) : false
                      
                      return (
                        <div
                          key={complaint.id}
                          className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-surface transition cursor-pointer"
                          onClick={() => navigate(`/complaints/${complaint.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-text-primary">
                                {complaint.reference}
                              </span>
                              <StatusChip status={complaint.status} />
                              {complaint.vulnerability_flag && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-semantic-warning/10 text-semantic-warning">
                                  🛡️ Vulnerable
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary truncate mb-2">
                              {complaint.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-4 text-xs flex-wrap">
                              {complaint.complainant?.full_name && (
                                <span className="text-text-muted">👤 {complaint.complainant.full_name}</span>
                              )}
                              <span className="text-text-muted">
                                📅 Received {dayjs(complaint.received_at).format('MMM D, YYYY')}
                              </span>
                              {relevantDate && (
                                <span
                                  className={`font-semibold ${
                                    isOverdue ? 'text-semantic-error' : 'text-semantic-warning'
                                  }`}
                                >
                                  ⏰ {isAckTask ? 'Ack' : 'Final'} {getRelativeTime(relevantDate)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAckTask && !complaint.acknowledged_at && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => handleQuickAcknowledge(complaint.id, e)}
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/complaints/${complaint.id}`)
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

