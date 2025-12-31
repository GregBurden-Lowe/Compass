import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Stack,
  Divider,
  Collapse,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  Chip,
} from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint } from '../types'
import { useAuth } from '../context/AuthContext'
import { StatusChip } from '../components/StatusChip'

/**
 * DashboardMetricsV2
 * This matches the backend metrics response included below.
 * If you already have a Metrics type, you can replace it with this interface
 * or merge fields as needed.
 */
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
  const location = useLocation()
  const { userId } = useAuth()

  const [metrics, setMetrics] = useState<DashboardMetricsV2 | null>(null)
  const [queue, setQueue] = useState<Complaint[]>([])
  const [queueTab, setQueueTab] = useState<QueueTab>('mine')

  const [showRiskDetails, setShowRiskDetails] = useState(false)
  const [loadingQueue, setLoadingQueue] = useState(false)

  useEffect(() => {
    api
      .get<DashboardMetricsV2>('/complaints/metrics', {
        // Cache-bust in case any intermediate proxy/browser caches GETs.
        params: { _: Date.now() },
      })
      .then((res) => setMetrics(res.data))
  }, [location.key])

  // Load queue list based on tab (small, focused calls)
  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setLoadingQueue(true)
      try {
        if (queueTab === 'mine') {
          // My open
          const res = await api.get<Complaint[]>('/complaints', {
            params: {
              handler_id: userId,
              // IMPORTANT: your list endpoint only supports a single status_filter (exact match),
              // so we can’t do "not closed" server-side unless you add that feature.
              // Practical approach: fetch assigned and filter client-side.
              page: 1,
              page_size: 50,
              // Cache-bust
              _: Date.now(),
            },
          })
          const items = (res.data || []).filter((c: any) => c.status !== 'closed')
          setQueue(sortQueue(items))
          return
        }

        if (queueTab === 'unassigned') {
          // No handler_id filter exists for "unassigned" in your list endpoint,
          // so we pull first 50 and filter. If you add `unassigned=true`, you can make this perfect.
          const res = await api.get<Complaint[]>('/complaints', { params: { page: 1, page_size: 100, _: Date.now() } })
          const items = (res.data || [])
            .filter((c: any) => c.status !== 'closed')
            .filter((c: any) => !c.assigned_handler_id)
          setQueue(sortQueue(items))
          return
        }

        if (queueTab === 'breached') {
          const res = await api.get<Complaint[]>('/complaints', {
            params: {
              overdue: true, // your backend treats this as ack_breached OR final_breached
              page: 1,
              page_size: 100,
              _: Date.now(),
            },
          })
          const items = (res.data || []).filter((c: any) => c.status !== 'closed')
          setQueue(sortQueue(items))
          return
        }

        if (queueTab === 'oldest') {
          const res = await api.get<Complaint[]>('/complaints', { params: { page: 1, page_size: 100, _: Date.now() } })
          const items = (res.data || []).filter((c: any) => c.status !== 'closed')
          // Oldest by received_at
          items.sort((a: any, b: any) => dayjs(a.received_at).valueOf() - dayjs(b.received_at).valueOf())
          setQueue(items.slice(0, 20))
          return
        }
      } finally {
        setLoadingQueue(false)
      }
    }

    load()
  }, [queueTab, userId, location.key])

  const asOfLabel = useMemo(() => {
    if (!metrics?.as_of) return null
    return dayjs(metrics.as_of).format('DD MMM YYYY HH:mm')
  }, [metrics?.as_of])

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Typography variant="h5">Dashboard</Typography>
        {asOfLabel && (
          <Typography variant="caption" color="text.secondary">
            As of {asOfLabel}
          </Typography>
        )}
      </Stack>

      {/* ROW A — KPI tiles (metrics-driven, always consistent) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <KpiCard
            title="Open now"
            value={metrics?.kpis.open}
            subtitle="All open complaints"
            onClick={() => setQueueTab('oldest')}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard
            title="My open"
            value={metrics?.kpis.my_open}
            subtitle="Assigned to you"
            onClick={() => setQueueTab('mine')}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard
            title="SLA breached (open)"
            value={metrics?.kpis.open_sla_breaches}
            subtitle="Ack or Final breached"
            onClick={() => setQueueTab('breached')}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard
            title="Stale (21d+)"
            value={metrics?.kpis.open_stale_21d}
            subtitle="No activity 21+ days"
            onClick={() => setQueueTab('oldest')}
          />
        </Grid>
      </Grid>

      {metrics && (
        <>
          {/* ROW B — SLA + Aging */}
          <Section title="SLA & Aging">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2">SLA performance (30d)</Typography>

                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      <SlaLine label="Ack" item={metrics.sla_30d.ack} />
                      <SlaLine label="Final" item={metrics.sla_30d.final} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2">Aging (open)</Typography>

                    <Stack spacing={1.2} sx={{ mt: 1 }}>
                      <AgingBar label="0–7 days" value={metrics.aging_open['0-7']} total={metrics.kpis.open} />
                      <AgingBar label="8–21 days" value={metrics.aging_open['8-21']} total={metrics.kpis.open} />
                      <AgingBar label="22–56 days" value={metrics.aging_open['22-56']} total={metrics.kpis.open} />
                      <AgingBar label="56+ days" value={metrics.aging_open['56+']} total={metrics.kpis.open} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Section>

          {/* ROW C — Workload */}
          <Section title="Workload">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2">Open by handler</Typography>
                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                      {metrics.workload_open_by_handler.slice(0, 6).map((h) => (
                        <Stack key={h.id} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{h.name}</Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {h.count}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2">Flow (last 7d)</Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      <StatChip label="New" value={metrics.flow_7d.new} />
                      <StatChip label="Closed" value={metrics.flow_7d.closed} />
                    </Stack>

                    <Typography variant="subtitle2" sx={{ mt: 2 }}>
                      Open status
                    </Typography>
                    <Stack spacing={0.6} sx={{ mt: 1 }}>
                      {Object.entries(metrics.status_open)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([k, v]) => (
                          <Stack key={k} direction="row" justifyContent="space-between">
                            <Typography variant="body2">{k.replace(/_/g, ' ')}</Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {v}
                            </Typography>
                          </Stack>
                        ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Section>

          {/* ROW D — Risk signals */}
          <Section title="Risk & Compliance">
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Vulnerable (open)</Typography>
                    <Typography variant="h5">{metrics.risk.open_vulnerable.count}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmtPct(metrics.risk.open_vulnerable.pct_of_open)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Escalated (open)</Typography>
                    <Typography variant="h5">{metrics.risk.escalated_open}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Current open escalations
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Reopened (all time)</Typography>
                    <Typography variant="h5">{metrics.risk.reopened.count}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmtPct(metrics.risk.reopened.pct_all_time)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Final attachments (open)</Typography>
                    <Typography variant="h5">{fmtPct(metrics.risk.final_attachment_open_pct)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Coverage on open cases
                    </Typography>
                  </Grid>
                </Grid>

                <Collapse in={showRiskDetails} unmountOnExit>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2">Notes</Typography>
                  <Typography variant="body2" color="text.secondary">
                    “Stale” means no communications in 21+ days (or received date if no comms).
                  </Typography>
                </Collapse>

                <Button size="small" onClick={() => setShowRiskDetails((v) => !v)} sx={{ mt: 1 }}>
                  {showRiskDetails ? 'Hide details' : 'View details'}
                </Button>
              </CardContent>
            </Card>
          </Section>

          {/* ROW E — My Queue */}
          <Section title="My Queue">
            <Card>
              <CardContent sx={{ pb: 1 }}>
                <Tabs
                  value={queueTab}
                  onChange={(_, v) => setQueueTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab value="mine" label="Assigned to me" />
                  <Tab value="unassigned" label="Unassigned" />
                  <Tab value="breached" label="SLA breached" />
                  <Tab value="oldest" label="Oldest open" />
                </Tabs>
              </CardContent>

              {loadingQueue && <LinearProgress />}

              <List dense>
                {!loadingQueue && queue.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No items" />
                  </ListItem>
                )}

                {queue.map((c: any) => (
                  <ListItem key={c.id} button onClick={() => navigate(`/complaints/${c.id}`)}>
                    <ListItemText
                      primary={`${c.reference} - ${c.complainant?.full_name ?? 'Unknown'}`}
                      secondary={secondaryLine(c)}
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                      {c.ack_breached || c.final_breached ? <Chip size="small" label="Breach" /> : null}
                      <StatusChip status={c.status} />
                    </Stack>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Section>
        </>
      )}
    </Box>
  )
}

/* -------------------- small UI helpers -------------------- */

function KpiCard({
  title,
  value,
  subtitle,
  onClick,
}: {
  title: string
  value: number | undefined
  subtitle?: string
  onClick?: () => void
}) {
  const content = (
    <CardContent>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="h4">{value ?? '—'}</Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  )

  return (
    <Card sx={{ height: '100%' }}>
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle1">{title}</Typography>
        <Divider sx={{ flexGrow: 1 }} />
      </Stack>
      {children}
    </Box>
  )
}

function SlaLine({
  label,
  item,
}: {
  label: string
  item: { on_time_pct: number | null; on_time: number; total: number }
}) {
  const pct = item.on_time_pct
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" fontWeight={700}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {item.total > 0 ? `${item.on_time}/${item.total}` : '—'}
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.3 }}>
        <Typography variant="body1">{fmtPct(pct)}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct ?? 0} sx={{ mt: 0.6 }} />
    </Box>
  )
}

function AgingBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={700}>
          {value}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.5 }} />
    </Box>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <Box>
      <Typography variant="subtitle2">{label}</Typography>
      <Typography variant="h5">{value}</Typography>
    </Box>
  )
}

function fmtPct(val: number | null | undefined) {
  return val !== null && val !== undefined ? `${val.toFixed(0)}%` : '—'
}

function secondaryLine(c: any) {
  const received = c.received_at ? dayjs(c.received_at).format('DD MMM YYYY') : '—'
  const product = c.product ? c.product : ''
  const parts = [product, `Received ${received}`].filter(Boolean)
  return parts.join(' • ')
}

/**
 * Sort queue:
 * 1) breached first
 * 2) then oldest received
 */
function sortQueue(items: Complaint[]) {
  return [...items].sort((a: any, b: any) => {
    const aBreach = a.ack_breached || a.final_breached ? 1 : 0
    const bBreach = b.ack_breached || b.final_breached ? 1 : 0
    if (aBreach !== bBreach) return bBreach - aBreach
    return dayjs(a.received_at).valueOf() - dayjs(b.received_at).valueOf()
  })
}