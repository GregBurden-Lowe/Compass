import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint } from '../types'
import { useAuth } from '../context/AuthContext'
import { TopBar } from '../components/layout'
import { Card, CardHeader, CardTitle, CardBody, Button } from '../components/ui'

type DashboardMetricsV2 = {
  as_of: string
  kpis: {
    open: number
    my_open: number
    open_sla_breaches: number
    open_stale_21d: number
  }
  sla_30d: {
    ack: { on_time_pct: number | null; on_time: number; total: number }
    final: { on_time_pct: number | null; on_time: number; total: number }
  }
  aging_open: { '0-7': number; '8-21': number; '22-56': number; '56+': number }
  flow_7d: { new: number; closed: number }
  workload_open_by_handler: Array<{ id: string; name: string; count: number }>
  status_open: Record<string, number>
  risk: {
    open_vulnerable: { count: number; pct_of_open: number | null }
    reopened: { count: number; pct_all_time: number | null }
    escalated_open: number
    final_attachment_open_pct: number | null
  }
}

type QueueTab = 'mine' | 'unassigned' | 'breached' | 'oldest'

export default function Dashboard() {
  const navigate = useNavigate()
  const { userId, token } = useAuth()

  const [metrics, setMetrics] = useState<DashboardMetricsV2 | null>(null)
  const [queue, setQueue] = useState<Complaint[]>([])
  const [queueTab, setQueueTab] = useState<QueueTab>('mine')
  const [loadingQueue, setLoadingQueue] = useState(false)

  useEffect(() => {
    if (!token) return
    
    api
      .get<DashboardMetricsV2>('/complaints/metrics', {
        params: { _: Date.now() },
      })
      .then((res) => setMetrics(res.data))
      .catch((err: any) => {
        if (err?.response?.status === 401) return
        console.error('Failed to load dashboard metrics', err)
      })
  }, [token])

  useEffect(() => {
    if (!userId || !token) return

    const load = async () => {
      setLoadingQueue(true)
      try {
        let items: Complaint[] = []
        
        if (queueTab === 'mine') {
          const res = await api.get<Complaint[]>('/complaints', {
            params: { handler_id: userId, page: 1, page_size: 50, _: Date.now() },
          })
          items = (res.data || []).filter((c: any) => c.status !== 'Closed')
        } else if (queueTab === 'unassigned') {
          const res = await api.get<Complaint[]>('/complaints', { params: { page: 1, page_size: 100, _: Date.now() } })
          items = (res.data || [])
            .filter((c: any) => c.status !== 'Closed')
            .filter((c: any) => !c.assigned_handler_id)
        } else if (queueTab === 'breached') {
          const res = await api.get<Complaint[]>('/complaints', {
            params: { overdue: true, page: 1, page_size: 100, _: Date.now() },
          })
          items = (res.data || []).filter((c: any) => c.status !== 'Closed')
        } else if (queueTab === 'oldest') {
          const res = await api.get<Complaint[]>('/complaints', { params: { page: 1, page_size: 100, _: Date.now() } })
          items = (res.data || []).filter((c: any) => c.status !== 'Closed')
          items.sort((a: any, b: any) => dayjs(a.received_at).valueOf() - dayjs(b.received_at).valueOf())
          items = items.slice(0, 20)
        }
        
        setQueue(items)
      } catch (err: any) {
        if (err?.response?.status === 401) return
        console.error('Failed to load queue', err)
      } finally {
        setLoadingQueue(false)
      }
    }

    load()
  }, [userId, token, queueTab])

  const formatPercent = (val: number | null) => {
    if (val === null) return 'N/A'
    return `${Math.round(val)}%`
  }

  return (
    <>
      <TopBar
        actions={
          <Button variant="primary" onClick={() => navigate('/create')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Complaint
          </Button>
        }
      />

      <div className="px-10 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="rounded-card border border-border bg-app p-6">
            <div className="text-sm font-semibold text-text-primary">Open Cases</div>
            <div className="mt-3 text-3xl font-semibold text-text-primary">{metrics?.kpis.open || 0}</div>
            <div className="mt-2 text-xs text-text-secondary">Total open complaints</div>
          </div>

          <div className="rounded-card border border-border bg-app p-6">
            <div className="text-sm font-semibold text-text-primary">My Open</div>
            <div className="mt-3 text-3xl font-semibold text-text-primary">{metrics?.kpis.my_open || 0}</div>
            <div className="mt-2 text-xs text-text-secondary">Assigned to me</div>
          </div>

          <div className="rounded-card border border-border bg-app p-6">
            <div className="text-sm font-semibold text-text-primary">SLA Breaches</div>
            <div className="mt-3 text-3xl font-semibold text-semantic-error">{metrics?.kpis.open_sla_breaches || 0}</div>
            <div className="mt-2 text-xs text-text-secondary">Open breaches</div>
          </div>

          <div className="rounded-card border border-border bg-app p-6">
            <div className="text-sm font-semibold text-text-primary">Stale (21d+)</div>
            <div className="mt-3 text-3xl font-semibold text-semantic-warning">{metrics?.kpis.open_stale_21d || 0}</div>
            <div className="mt-2 text-xs text-text-secondary">No activity</div>
          </div>
        </div>

        {/* SLA Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Acknowledgement SLA (30d)</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-secondary">On-time rate</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatPercent(metrics?.sla_30d.ack.on_time_pct || null)}
                  </span>
                </div>
                <div className="w-full h-2 bg-app rounded-full overflow-hidden">
                  <div
                    className="h-full bg-semantic-success"
                    style={{ width: `${metrics?.sla_30d.ack.on_time_pct || 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {metrics?.sla_30d.ack.on_time || 0} / {metrics?.sla_30d.ack.total || 0} on time
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Final Response SLA (30d)</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-secondary">On-time rate</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatPercent(metrics?.sla_30d.final.on_time_pct || null)}
                  </span>
                </div>
                <div className="w-full h-2 bg-app rounded-full overflow-hidden">
                  <div
                    className="h-full bg-semantic-success"
                    style={{ width: `${metrics?.sla_30d.final.on_time_pct || 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {metrics?.sla_30d.final.on_time || 0} / {metrics?.sla_30d.final.total || 0} on time
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Queue */}
        <Card>
          <CardHeader>
            <CardTitle>My Queue</CardTitle>
          </CardHeader>
          <div className="mt-4 border-b border-border">
            <div className="flex gap-1 px-4">
              {(['mine', 'unassigned', 'breached', 'oldest'] as QueueTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setQueueTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 ${
                    queueTab === tab
                      ? 'border-brand text-text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {loadingQueue ? (
              <div className="text-center py-8 text-text-muted">Loading...</div>
            ) : queue.length === 0 ? (
              <div className="text-center py-8 text-text-muted">No complaints in this queue</div>
            ) : (
              <div className="space-y-2">
                {queue.map((complaint) => (
                  <div
                    key={complaint.id}
                    onClick={() => navigate(`/complaints/${complaint.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-app cursor-pointer transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary truncate">
                        {complaint.reference}
                      </div>
                      <div className="text-xs text-text-secondary truncate mt-1">
                        {complaint.description || 'No description'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {dayjs(complaint.received_at).format('MMM D')}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                          complaint.status === 'New'
                            ? 'bg-semantic-info/10 text-semantic-info'
                            : complaint.status === 'Acknowledged'
                            ? 'bg-semantic-success/10 text-semantic-success'
                            : 'bg-app text-text-secondary'
                        }`}
                      >
                        {complaint.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
