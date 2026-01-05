import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import { Delete, Visibility, Download } from '@mui/icons-material'
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
      await api.post(`/reference/${kind}/import`, formData)
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

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string; file_name: string } | null>(null)

  const loadAttachments = async () => {
    setLoadingAttachments(true)
    setError(null)
    try {
      const res = await api.get('/complaints/attachments/list', { params: { limit: 200 } })
      setAttachments(res.data.attachments || [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load attachments')
    } finally {
      setLoadingAttachments(false)
    }
  }

  useEffect(() => {
    load()
    loadAttachments()
  }, [])

  const handleDeleteAttachment = (attachment: any) => {
    setAttachmentToDelete({ id: attachment.id, file_name: attachment.file_name })
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return
    setDeletingAttachmentId(attachmentToDelete.id)
    setError(null)
    try {
      await api.delete(`/complaints/attachments/${attachmentToDelete.id}`)
      await loadAttachments()
      setDeleteConfirmOpen(false)
      setAttachmentToDelete(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete attachment')
    } finally {
      setDeletingAttachmentId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

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
        
        {/* Attachments Section */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Attachments</Typography>
              <Button onClick={loadAttachments} disabled={loadingAttachments}>
                Refresh
              </Button>
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Content Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingAttachments ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading...</TableCell>
                  </TableRow>
                ) : attachments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No attachments found</TableCell>
                  </TableRow>
                ) : (
                  attachments.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell>{att.file_name}</TableCell>
                      <TableCell>
                        <Chip label={att.content_type} size="small" />
                      </TableCell>
                      <TableCell>{formatFileSize(att.file_size_bytes)}</TableCell>
                      <TableCell>
                        {att.uploaded_at ? new Date(att.uploaded_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={att.file_exists ? 'Exists' : 'Missing'}
                          color={att.file_exists ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            component="a"
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            title="View/Download"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAttachment(att)}
                            disabled={deletingAttachmentId === att.id}
                            color="error"
                            title="Delete"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Stack>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Attachment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{attachmentToDelete?.file_name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will permanently delete the file from disk and remove the database record. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteAttachment}
            color="error"
            variant="contained"
            disabled={deletingAttachmentId !== null}
          >
            {deletingAttachmentId ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}


