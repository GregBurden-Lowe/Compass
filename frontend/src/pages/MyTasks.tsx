import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint } from '../types'
import { TopBar } from '../components/layout'
import { Button, Card, CardHeader, CardTitle, CardBody } from '../components/ui'
import { StatusChip } from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'

interface TaskGroup {
  title: string
  description: string
  icon: string
  color: string
  complaints: Complaint[]
}

export default function MyTasks() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskGroup[]>([])

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      // Fetch all complaints assigned to the current user
      const res = await api.get<Complaint[]>('/complaints')
      const myComplaints = res.data.filter(
        (c) => c.assigned_handler_id === user?.id && c.status !== 'Closed'
      )

      // Group tasks by what needs to be done
      const acknowledgementsDue = myComplaints.filter(
        (c) =>
          (c.status === 'New' || c.status === 'Reopened') &&
          !c.acknowledged_at &&
          dayjs(c.ack_due_at).isAfter(dayjs())
      )

      const acknowledgementsOverdue = myComplaints.filter(
        (c) =>
          (c.status === 'New' || c.status === 'Reopened') &&
          !c.acknowledged_at &&
          dayjs(c.ack_due_at).isBefore(dayjs())
      )

      const inInvestigation = myComplaints.filter(
        (c) => c.status === 'In Investigation' || c.status === 'Acknowledged'
      )

      const finalResponsesDue = myComplaints.filter(
        (c) =>
          c.status === 'Response Drafted' &&
          !c.final_response_at &&
          dayjs(c.final_due_at).isAfter(dayjs())
      )

      const finalResponsesOverdue = myComplaints.filter(
        (c) =>
          (c.status === 'Response Drafted' ||
            c.status === 'In Investigation' ||
            c.status === 'Acknowledged') &&
          !c.final_response_at &&
          dayjs(c.final_due_at).isBefore(dayjs())
      )

      const taskGroups: TaskGroup[] = []

      if (acknowledgementsOverdue.length > 0) {
        taskGroups.push({
          title: 'Acknowledgements Overdue',
          description: 'These complaints need acknowledgement urgently',
          icon: '🚨',
          color: 'semantic-error',
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
          color: 'semantic-warning',
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
          color: 'semantic-error',
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
          color: 'semantic-info',
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
          color: 'brand',
          complaints: inInvestigation.sort(
            (a, b) => dayjs(a.received_at).valueOf() - dayjs(b.received_at).valueOf()
          ),
        })
      }

      setTasks(taskGroups)
    } catch (err) {
      console.error('Failed to load tasks', err)
    } finally {
      setLoading(false)
    }
  }

  const getTotalTasks = () => {
    return tasks.reduce((sum, group) => sum + group.complaints.length, 0)
  }

  if (loading) {
    return (
      <>
        <TopBar title="My Tasks" />
        <div className="px-10 py-6">
          <div className="text-center py-12 text-text-muted">Loading your tasks...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="My Tasks" />

      <div className="px-10 py-6">
        {/* Summary */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-primary">Your Work List</h2>
          <p className="text-sm text-text-secondary mt-1">
            You have {getTotalTasks()} {getTotalTasks() === 1 ? 'task' : 'tasks'} requiring attention
          </p>
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
                      className={`inline-flex items-center justify-center h-8 min-w-8 rounded-full bg-${taskGroup.color}/10 text-${taskGroup.color} px-2 text-sm font-bold`}
                    >
                      {taskGroup.complaints.length}
                    </span>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3 mt-4">
                    {taskGroup.complaints.map((complaint) => (
                      <div
                        key={complaint.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-surface transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-bold text-text-primary">
                              {complaint.reference}
                            </span>
                            <StatusChip status={complaint.status} />
                          </div>
                          <p className="text-sm text-text-secondary truncate mb-2">
                            {complaint.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-text-muted">
                            {complaint.complainant?.full_name && (
                              <span>👤 {complaint.complainant.full_name}</span>
                            )}
                            <span>📅 Received {dayjs(complaint.received_at).format('MMM D, YYYY')}</span>
                            {taskGroup.title.includes('Acknowledgement') && (
                              <span
                                className={
                                  dayjs(complaint.ack_due_at).isBefore(dayjs())
                                    ? 'text-semantic-error font-semibold'
                                    : ''
                                }
                              >
                                ⏰ Ack due {dayjs(complaint.ack_due_at).format('MMM D, YYYY')}
                              </span>
                            )}
                            {taskGroup.title.includes('Final Response') && (
                              <span
                                className={
                                  dayjs(complaint.final_due_at).isBefore(dayjs())
                                    ? 'text-semantic-error font-semibold'
                                    : ''
                                }
                              >
                                ⏰ Final due {dayjs(complaint.final_due_at).format('MMM D, YYYY')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/complaints/${complaint.id}`)}
                        >
                          Go to Claim
                        </Button>
                      </div>
                    ))}
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

