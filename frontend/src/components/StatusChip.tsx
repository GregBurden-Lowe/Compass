import { Chip } from '@mui/material'
import { ComplaintStatus } from '../types'

const colors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  new: 'default',
  acknowledged: 'primary',
  in_investigation: 'warning',
  response_drafted: 'secondary',
  final_response_issued: 'success',
  closed: 'success',
  reopened: 'default',
}

const labelize = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

export const StatusChip = ({ status }: { status: ComplaintStatus }) => {
  const key = typeof status === 'string' ? status.toLowerCase() : (status as string)
  return <Chip size="small" label={labelize(key)} color={colors[key] || 'default'} />
}

