import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { TopBar } from '../components/layout'
import { Card, CardHeader, CardTitle, CardBody, Button, Table } from '../components/ui'
import { useAuth } from '../context/AuthContext'

type SlaByHandlerRow = {
  handler_id: string
  handler_name: string
  ack_on_time: number
  ack_missed: number
  ack_total: number
  ack_on_time_pct: number | null
  final_on_time: number
  final_missed: number
  final_total: number
  final_on_time_pct: number | null
}

type SlaByUserResponse = {
  period_days: number
  since: string
  as_of: string
  by_handler: SlaByHandlerRow[]
}

export default function Reports() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [periodDays, setPeriodDays] = useState(30)
  const [report, setReport] = useState<SlaByUserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isManager = user?.role === 'admin' || user?.role === 'complaints_manager'

  useEffect(() => {
    if (!isManager) {
      navigate('/', { replace: true })
      return
    }
    loadReport()
  }, [isManager, periodDays, token])

  const loadReport = async () => {
    if (!token || !isManager) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<SlaByUserResponse>('/complaints/sla-by-user', {
        params: { days: periodDays },
      })
      setReport(res.data)
    } catch (err: any) {
      if (err?.response?.status === 401) return
      console.error('Failed to load SLA report', err)
      setError('Failed to load report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isManager) return null

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Reports" />
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-text-secondary text-sm">
              SLA performance by assigned handler. Use these reports to manage performance and identify training needs.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Period:</span>
              {[30, 90].map((d) => (
                <Button
                  key={d}
                  variant={periodDays === d ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPeriodDays(d)}
                >
                  Last {d} days
                </Button>
              ))}
              <Button variant="secondary" size="sm" onClick={loadReport} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-semantic-error/10 border border-semantic-error/30 px-4 py-3 text-sm text-semantic-error">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-text-secondary text-sm">Loading report…</div>
          )}

          {!loading && report && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Cases within SLA by user</CardTitle>
                  <p className="text-sm text-text-secondary mt-1">
                    Complaints received in the last {report.period_days} days where acknowledgement and final response were on time.
                  </p>
                </CardHeader>
                <CardBody>
                  {report.by_handler.length === 0 ? (
                    <p className="text-text-secondary text-sm">No assigned cases in this period.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <th className="text-left">Handler</th>
                          <th className="text-right">Ack on time</th>
                          <th className="text-right">Ack %</th>
                          <th className="text-right">Final on time</th>
                          <th className="text-right">Final %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.by_handler.map((row) => (
                          <tr key={row.handler_id}>
                            <td className="font-medium">{row.handler_name}</td>
                            <td className="text-right">{row.ack_on_time} / {row.ack_total}</td>
                            <td className="text-right">
                              {row.ack_on_time_pct != null ? `${row.ack_on_time_pct}%` : '–'}
                            </td>
                            <td className="text-right">{row.final_on_time} / {row.final_total}</td>
                            <td className="text-right">
                              {row.final_on_time_pct != null ? `${row.final_on_time_pct}%` : '–'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SLAs missed by user</CardTitle>
                  <p className="text-sm text-text-secondary mt-1">
                    Acknowledgement and final response breaches in the last {report.period_days} days.
                  </p>
                </CardHeader>
                <CardBody>
                  {report.by_handler.length === 0 ? (
                    <p className="text-text-secondary text-sm">No assigned cases in this period.</p>
                  ) : (() => {
                    const missedRows = report.by_handler
                      .filter((row) => row.ack_missed > 0 || row.final_missed > 0)
                      .sort((a, b) => (b.ack_missed + b.final_missed) - (a.ack_missed + a.final_missed))
                    if (missedRows.length === 0) {
                      return <p className="text-text-secondary text-sm">No SLA breaches in this period.</p>
                    }
                    return (
                      <Table>
                        <thead>
                          <tr>
                            <th className="text-left">Handler</th>
                            <th className="text-right">Ack missed</th>
                            <th className="text-right">Final missed</th>
                            <th className="text-right">Total missed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {missedRows.map((row) => (
                            <tr key={row.handler_id}>
                              <td className="font-medium">{row.handler_name}</td>
                              <td className="text-right">
                                {row.ack_missed > 0 ? (
                                  <span className="text-semantic-error">{row.ack_missed}</span>
                                ) : (
                                  row.ack_missed
                                )}
                              </td>
                              <td className="text-right">
                                {row.final_missed > 0 ? (
                                  <span className="text-semantic-error">{row.final_missed}</span>
                                ) : (
                                  row.final_missed
                                )}
                              </td>
                              <td className="text-right font-medium">
                                {row.ack_missed + row.final_missed}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )
                  })()}
                </CardBody>
              </Card>

              <p className="text-xs text-text-secondary">
                Report as of {report.as_of}. Data for complaints received since {report.since}.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
