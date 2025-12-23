import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { Complaint, ComplaintStatus, User } from '../types'
import { StatusChip } from '../components/StatusChip'

const statusOptions: ComplaintStatus[] = [
  'New',
  'Acknowledged',
  'In Investigation',
  'Response Drafted',
  'Final Response Issued',
  'Closed',
  'Reopened',
]

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const fetchData = () => {
    api
      .get<Complaint[]>('/complaints', { params: { status_filter: status || undefined, search: search || undefined } })
      .then((res) => setComplaints(res.data))
  }

  useEffect(() => {
    fetchData()
    api.get<User[]>('/users').then((res) => setUsers(res.data))
  }, [])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Complaints
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Status"
                fullWidth
                size="small"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {statusOptions.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                label="Search ref / policy / name"
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4} display="flex" alignItems="center" gap={1}>
              <Button variant="contained" onClick={fetchData}>
                Apply
              </Button>
              <Button component={Link} to="/complaints/new">
                New complaint
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Reference</TableCell>
              <TableCell>Complainant</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Handler</TableCell>
              <TableCell>Received</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due (Final)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {complaints.map((c) => (
              <TableRow
                key={c.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/complaints/${c.id}`)}
              >
                <TableCell>{c.reference}</TableCell>
                <TableCell>{c.complainant?.full_name}</TableCell>
                <TableCell>{c.product}</TableCell>
                <TableCell>{c.assigned_handler_name || 'Unassigned'}</TableCell>
                <TableCell>{dayjs(c.received_at).format('DD MMM YYYY')}</TableCell>
                <TableCell>
                  <StatusChip status={c.status} />
                </TableCell>
                <TableCell>{dayjs(c.final_due_at).format('DD MMM YYYY')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}

