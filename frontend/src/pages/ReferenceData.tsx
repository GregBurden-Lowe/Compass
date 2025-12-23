import React, { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Stack, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { api } from '../api/client'
import { ReferenceItem } from '../types'

type Kind = 'products' | 'brokers' | 'insurers'

const labels: Record<Kind, string> = {
  products: 'Products',
  brokers: 'Brokers',
  insurers: 'Insurers',
}

export default function ReferenceData() {
  const [data, setData] = useState<Record<Kind, ReferenceItem[]>>({
    products: [],
    brokers: [],
    insurers: [],
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Record<Kind, string>>({
    products: '',
    brokers: '',
    insurers: '',
  })
  const [fileInput, setFileInput] = useState<Record<Kind, File | null>>({
    products: null,
    brokers: null,
    insurers: null,
  })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [products, brokers, insurers] = await Promise.all([
        api.get<ReferenceItem[]>('/reference/products'),
        api.get<ReferenceItem[]>('/reference/brokers'),
        api.get<ReferenceItem[]>('/reference/insurers'),
      ])
      setData({ products: products.data, brokers: brokers.data, insurers: insurers.data })
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load reference data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createOne = async (kind: Kind) => {
    const name = form[kind].trim()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      await api.post(`/reference/${kind}`, { name })
      setForm((f) => ({ ...f, [kind]: '' }))
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create item')
    } finally {
      setSaving(false)
    }
  }

  const importCsv = async (kind: Kind) => {
    const file = fileInput[kind]
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/reference/${kind}/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFileInput((f) => ({ ...f, [kind]: null }))
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to import CSV')
    } finally {
      setSaving(false)
    }
  }

  const downloadTemplate = (kind: Kind) => {
    const csv = 'name\nSample Name\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${kind}_template.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

const Section = ({ kind }: { kind: Kind }) => (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{labels[kind]}</Typography>
          <Button onClick={() => downloadTemplate(kind)}>Download CSV template</Button>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
          <TextField
            label={`Add ${labels[kind].slice(0, -1)}`}
            size="small"
            value={form[kind]}
            onChange={(e) => setForm((f) => ({ ...f, [kind]: e.target.value }))}
            fullWidth
          />
          <Button variant="contained" onClick={() => createOne(kind)} disabled={saving}>
            Add
          </Button>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" mb={2}>
          <Button variant="outlined" component="label" disabled={saving}>
            Choose CSV
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFileInput((f) => ({ ...f, [kind]: e.target.files?.[0] || null }))}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {fileInput[kind]?.name || 'No file selected'}
          </Typography>
          <Button variant="contained" onClick={() => importCsv(kind)} disabled={saving || !fileInput[kind]}>
            Import CSV
          </Button>
        </Stack>
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data[kind].map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {data[kind].length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>{loading ? 'Loading...' : 'No records'}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Reference data
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage products, brokers, and insurers. Add individually or import via CSV (column: name).
      </Typography>
      <Stack spacing={3}>
        <Section kind="products" />
        <Section kind="brokers" />
        <Section kind="insurers" />
      </Stack>
    </Box>
  )
}


