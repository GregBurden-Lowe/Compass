import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { TopBar } from '../components/layout'
import { Button, Input, Card, CardHeader, CardTitle, CardBody, Modal, ModalHeader, ModalBody, ModalFooter, Table } from '../components/ui'
import type { ReferenceItem } from '../types'
import dayjs from 'dayjs'

type ReferenceType = 'products' | 'brokers' | 'insurers'

export default function ReferenceData() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState<ReferenceType>('products')
  const [items, setItems] = useState<ReferenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editItem, setEditItem] = useState<ReferenceItem | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ReferenceItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, [activeTab])

  const loadItems = async () => {
    setLoading(true)
    try {
      const res = await api.get<ReferenceItem[]>(`/reference/${activeTab}`)
      setItems(res.data || [])
    } catch (err) {
      console.error('Failed to load reference items', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newItemName.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      await api.post(`/reference/${activeTab}`, { name: newItemName.trim() })
      setNewItemName('')
      setShowCreateModal(false)
      loadItems()
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || 'Failed to create item')
    } finally {
      setCreating(false)
    }
  }

  const openEditModal = (item: ReferenceItem) => {
    setEditItem(item)
    setEditName(item.name)
    setEditError(null)
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    if (!editItem || !editName.trim()) return

    setSaving(true)
    setEditError(null)
    try {
      await api.patch(`/reference/${activeTab}/${editItem.id}`, { name: editName.trim() })
      setShowEditModal(false)
      setEditItem(null)
      loadItems()
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Failed to update item')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteModal = (item: ReferenceItem) => {
    setItemToDelete(item)
    setDeleteError(null)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/reference/${activeTab}/${itemToDelete.id}`)
      setShowDeleteModal(false)
      setItemToDelete(null)
      loadItems()
    } catch (err: any) {
      setDeleteError(err?.response?.data?.detail || 'Failed to delete item')
    } finally {
      setDeleting(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) return

    setImporting(true)
    setImportError(null)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const res = await api.post(`/reference/${activeTab}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setImportResult(`Successfully imported ${res.data.added} items`)
      setImportFile(null)
      loadItems()
      setTimeout(() => setShowImportModal(false), 2000)
    } catch (err: any) {
      setImportError(err?.response?.data?.detail || 'Failed to import file')
    } finally {
      setImporting(false)
    }
  }

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTabLabel = (type: ReferenceType) => {
    switch (type) {
      case 'products':
        return 'Products'
      case 'brokers':
        return 'Brokers'
      case 'insurers':
        return 'Insurers'
    }
  }

  return (
    <>
      <TopBar title="Reference Data Management" />

      <div className="px-10 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>{getTabLabel(activeTab)}</CardTitle>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Import CSV
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add New
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex gap-1 px-4">
              {(['products', 'brokers', 'insurers'] as ReferenceType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize transition border-b-2 ${
                    activeTab === tab
                      ? 'border-brand text-text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {getTabLabel(tab)}
                </button>
              ))}
            </div>
          </div>

          <CardBody>
            {/* Search */}
            <div className="mt-4 mb-6">
              <Input
                type="search"
                placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            {/* Items Table */}
            {loading ? (
              <div className="text-center py-12 text-text-muted">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-4 text-sm font-semibold text-text-primary">
                  {searchTerm ? 'No items match your search' : `No ${getTabLabel(activeTab).toLowerCase()} yet`}
                </p>
                {!searchTerm && isAdmin && (
                  <p className="mt-1 text-sm text-text-secondary">
                    Click "Add New" to create your first entry
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Created</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium text-text-primary">{item.name}</td>
                        <td className="text-text-secondary text-sm">
                          {item.created_at ? dayjs(item.created_at).format('MMM D, YYYY') : '—'}
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(item)}
                                className="text-brand hover:text-brand-dark text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(item)}
                                className="text-semantic-error hover:opacity-80 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalHeader onClose={() => setShowCreateModal(false)}>
          Add New {getTabLabel(activeTab).slice(0, -1)}
        </ModalHeader>
        <ModalBody>
          {createError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {createError}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-primary">Name *</label>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Enter ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} name...`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newItemName.trim()) {
                  handleCreate()
                }
              }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!newItemName.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
        <ModalHeader onClose={() => setShowEditModal(false)}>
          Edit {getTabLabel(activeTab).slice(0, -1)}
        </ModalHeader>
        <ModalBody>
          {editError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {editError}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-primary">Name *</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={`Enter ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} name...`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editName.trim()) handleUpdate()
              }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdate} disabled={!editName.trim() || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <ModalHeader onClose={() => setShowDeleteModal(false)}>Delete {getTabLabel(activeTab).slice(0, -1)}</ModalHeader>
        <ModalBody>
          {deleteError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong className="text-text-primary">{itemToDelete?.name}</strong>? This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDelete}
            disabled={!itemToDelete || deleting}
            className="bg-semantic-error hover:bg-semantic-error/90"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImportModal} onClose={() => setShowImportModal(false)}>
        <ModalHeader onClose={() => setShowImportModal(false)}>
          Import {getTabLabel(activeTab)} from CSV
        </ModalHeader>
        <ModalBody>
          {importError && (
            <div className="mb-4 rounded-lg border border-semantic-error/30 bg-semantic-error/5 p-3 text-sm text-semantic-error">
              {importError}
            </div>
          )}
          {importResult && (
            <div className="mb-4 rounded-lg border border-semantic-success/30 bg-semantic-success/5 p-3 text-sm text-semantic-success">
              {importResult}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-3">
                Upload a CSV file with a "name" column. Duplicate names will be skipped.
              </p>
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <svg
                    className="mx-auto h-12 w-12 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-text-primary">
                    Click to select CSV file
                  </p>
                  <p className="mt-1 text-xs text-text-muted">or drag and drop</p>
                </label>
              </div>
              {importFile && (
                <div className="mt-3 flex items-center gap-2 text-sm text-text-primary">
                  <svg className="h-5 w-5 text-semantic-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {importFile.name}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-app p-3 text-xs text-text-secondary">
              <p className="font-semibold text-text-primary mb-1">CSV Format Example:</p>
              <code className="block bg-surface p-2 rounded border border-border font-mono">
                name<br />
                Product A<br />
                Product B<br />
                Product C
              </code>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!importFile || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
