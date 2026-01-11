import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint } from '../types'
import { TopBar } from '../components/layout'
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui'
import { StatusChip } from '../components/StatusChip'

export default function ComplaintsList() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api
      .get<Complaint[]>('/complaints', { params: { page: 1, page_size: 100 } })
      .then((res) => {
        setComplaints(res.data || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load complaints', err)
        setLoading(false)
      })
  }, [])

  const filteredComplaints = complaints.filter((c) =>
    c.reference.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <TopBar title="Complaints" />

      <div className="px-10 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="w-full max-w-md">
            <Input
              type="search"
              placeholder="Search complaints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>
          <Button variant="primary" onClick={() => navigate('/create')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Complaint
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-muted">Loading complaints...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Handler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.map((complaint) => (
                <TableRow key={complaint.id} onClick={() => navigate(`/complaints/${complaint.id}`)}>
                  <TableCell>
                    <span className="font-semibold">{complaint.reference}</span>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={complaint.status} />
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-md block">{complaint.description || 'No description'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-text-muted">{dayjs(complaint.received_at).format('MMM D, YYYY')}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-text-muted">{complaint.assigned_handler_name || 'Unassigned'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && filteredComplaints.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-semibold text-text-primary">No complaints found</p>
            <p className="mt-1 text-sm text-text-secondary">Try adjusting your search</p>
          </div>
        )}
      </div>
    </>
  )
}
