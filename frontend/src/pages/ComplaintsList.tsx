import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint, User } from '../types'
import { TopBar } from '../components/layout'
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card } from '../components/ui'
import { StatusChip } from '../components/StatusChip'

type SortField = 'reference' | 'status' | 'received_at' | 'handler' | 'complainant'
type SortDirection = 'asc' | 'desc'

export default function ComplaintsList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  // Use backend enum values in queries (e.g. "in_investigation"), keep "all" as a UI sentinel.
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [handlerFilter, setHandlerFilter] = useState<string>('all')
  const [overdueFilter, setOverdueFilter] = useState(false)
  const [vulnerableFilter, setVulnerableFilter] = useState(false)
  const [sortField, setSortField] = useState<SortField>('received_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [handlers, setHandlers] = useState<User[]>([])

  // Read initial filters from URL query params (for deep-links from Dashboard, etc.)
  useEffect(() => {
    const overdue = searchParams.get('overdue')
    const vulnerability = searchParams.get('vulnerability')
    const status = searchParams.get('status')
    const handler = searchParams.get('handler')
    const q = searchParams.get('search')

    if (overdue !== null) setOverdueFilter(overdue === 'true')
    if (vulnerability !== null) setVulnerableFilter(vulnerability === 'true')
    if (status) setStatusFilter(status)
    if (handler) setHandlerFilter(handler)
    if (q) setSearch(q)
    // reset to first page when arriving via deep-link
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadComplaints = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { page, page_size: pageSize, _: Date.now() }
      // Backend expects: status_filter, handler_id, vulnerability, overdue, search, date_from/date_to
      if (statusFilter !== 'all') params.status_filter = statusFilter
      if (handlerFilter !== 'all' && handlerFilter !== 'unassigned') params.handler_id = handlerFilter
      if (overdueFilter) params.overdue = true
      if (vulnerableFilter) params.vulnerability = true
      if (search.trim()) params.search = search.trim()
      
      const res = await api.get<Complaint[]>('/complaints', { params })
      // NOTE: backend does not currently support an explicit "unassigned" filter.
      // Workaround: filter unassigned in the returned page results.
      const items = res.data || []
      setComplaints(handlerFilter === 'unassigned' ? items.filter((c) => !c.assigned_handler_id) : items)
      
      // Calculate total pages (rough estimate since we don't have total count from API)
      if (res.data && res.data.length === pageSize) {
        setTotalPages(page + 1)
      } else {
        setTotalPages(page)
      }
    } catch (err: any) {
      console.error('Failed to load complaints', err)
      setError('Failed to load complaints. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadHandlers = async () => {
    try {
      const res = await api.get<User[]>('/users')
      setHandlers(res.data || [])
    } catch (err) {
      console.error('Failed to load handlers', err)
    }
  }

  useEffect(() => {
    loadHandlers()
  }, [])

  useEffect(() => {
    loadComplaints()
  }, [page, handlerFilter, overdueFilter, statusFilter, vulnerableFilter])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const filteredComplaints = complaints.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortField) {
        case 'reference':
          aVal = a.reference
          bVal = b.reference
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'received_at':
          aVal = new Date(a.received_at).getTime()
          bVal = new Date(b.received_at).getTime()
          break
        case 'handler':
          aVal = a.assigned_handler_name || 'zzz'
          bVal = b.assigned_handler_name || 'zzz'
          break
        case 'complainant':
          aVal = a.complainant?.full_name || 'zzz'
          bVal = b.complainant?.full_name || 'zzz'
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const isOverdue = (complaint: Complaint) => {
    if (complaint.status === 'Closed') return false
    
    const now = dayjs()
    if (!complaint.acknowledged_at && complaint.ack_due_at) {
      return dayjs(complaint.ack_due_at).isBefore(now)
    }
    if (!complaint.final_response_at && complaint.final_due_at) {
      return dayjs(complaint.final_due_at).isBefore(now)
    }
    return false
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setHandlerFilter('all')
    setOverdueFilter(false)
    setVulnerableFilter(false)
    setPage(1)
  }

  const activeFilterCount = [
    search !== '',
    statusFilter !== 'all',
    handlerFilter !== 'all',
    overdueFilter,
    vulnerableFilter,
  ].filter(Boolean).length

  return (
    <>
      <TopBar
        title="Complaints"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadComplaints} disabled={loading}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="primary" onClick={() => navigate('/create')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Complaint
            </Button>
          </div>
        }
      />

      <div className="px-10 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Filters & Search</h3>
              {activeFilterCount > 0 && (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear all ({activeFilterCount})
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <Input
                  type="search"
                  placeholder="Search by reference, description, or complainant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setPage(1)
                      loadComplaints()
                    }
                  }}
                  leadingIcon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
                <p className="mt-1 text-xs text-text-muted">
                  Tip: Press Enter or click Refresh to run a new search (server-side).
                </p>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-xs font-medium text-text-primary mb-1">Status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="all">All Statuses</option>
                  {/* Use backend enum values for filtering; label remains human-readable */}
                  <option value="new">New</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_investigation">In Investigation</option>
                  <option value="response_drafted">Response Drafted</option>
                  <option value="final_response_issued">Final Response Issued</option>
                  <option value="reopened">Reopened</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Handler Filter */}
              <div>
                <label htmlFor="handler-filter" className="block text-xs font-medium text-text-primary mb-1">Handler</label>
                <select
                  id="handler-filter"
                  value={handlerFilter}
                  onChange={(e) => setHandlerFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="all">All Handlers</option>
                  <option value="unassigned">Unassigned</option>
                  {handlers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overdueFilter}
                    onChange={(e) => setOverdueFilter(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-text-primary">Overdue only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vulnerableFilter}
                    onChange={(e) => setVulnerableFilter(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-text-primary">Vulnerable only</span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-4 flex items-center justify-between">
            <span className="text-sm text-semantic-error">{error}</span>
            <Button variant="secondary" onClick={loadComplaints}>
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-text-muted">Loading complaints...</div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                Showing {filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? 's' : ''}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-text-secondary">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('reference')}
                      className="flex items-center gap-1 hover:text-text-primary transition"
                    >
                      Reference {getSortIcon('reference')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-text-primary transition"
                    >
                      Status {getSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('complainant')}
                      className="flex items-center gap-1 hover:text-text-primary transition"
                    >
                      Complainant {getSortIcon('complainant')}
                    </button>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('received_at')}
                      className="flex items-center gap-1 hover:text-text-primary transition"
                    >
                      Received {getSortIcon('received_at')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('handler')}
                      className="flex items-center gap-1 hover:text-text-primary transition"
                    >
                      Handler {getSortIcon('handler')}
                    </button>
                  </TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map((complaint) => {
                  const overdue = isOverdue(complaint)
                  
                  return (
                    <TableRow key={complaint.id} onClick={() => navigate(`/complaints/${complaint.id}`)}>
                      <TableCell>
                        <span className="font-semibold">{complaint.reference}</span>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={complaint.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-text-primary">
                          {complaint.complainant?.full_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="truncate max-w-xs block text-text-secondary">
                          {complaint.description || 'No description'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-text-muted">
                          {dayjs(complaint.received_at).format('MMM D, YYYY')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-text-muted">
                          {complaint.assigned_handler_name || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {overdue && (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-semantic-error/10 text-semantic-error"
                              title="SLA breach"
                            >
                              ⚠️ Overdue
                            </span>
                          )}
                          {complaint.vulnerability_flag && (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-semantic-warning/10 text-semantic-warning"
                              title="Vulnerable customer"
                            >
                              🛡️ Vulnerable
                            </span>
                          )}
                          {complaint.fos_complaint && (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700"
                              title="Referred to FOS"
                            >
                              FOS
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-text-secondary">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {!loading && filteredComplaints.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-semibold text-text-primary">No complaints found</p>
            <p className="mt-1 text-sm text-text-secondary">
              {activeFilterCount > 0 
                ? 'Try adjusting your filters or search criteria'
                : 'No complaints have been created yet'
              }
            </p>
            {activeFilterCount > 0 && (
              <Button variant="secondary" onClick={clearFilters} className="mt-4">
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
