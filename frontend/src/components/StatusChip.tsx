import { ComplaintStatus } from '../types'

interface StatusChipProps {
  status: ComplaintStatus | string
  className?: string
}

// API returns status in backend form (new, in_investigation); map to display label and color
const STATUS_DISPLAY: Record<string, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  in_investigation: 'In Investigation',
  response_drafted: 'Response Drafted',
  final_response_issued: 'Final Response Issued',
  closed: 'Closed',
  reopened: 'Reopened',
  awaiting_customer: 'Awaiting Customer',
  escalated: 'Escalated',
}

export function StatusChip({ status, className = '' }: StatusChipProps) {
  const normalized = typeof status === 'string' ? status.toLowerCase().replace(/ /g, '_') : status
  const displayLabel = STATUS_DISPLAY[normalized] ?? (typeof status === 'string' ? status : 'Unknown')

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'new':
      case 'reopened':
        return 'bg-semantic-info/10 text-semantic-info border-semantic-info/20'
      case 'acknowledged':
        return 'bg-semantic-success/10 text-semantic-success border-semantic-success/20'
      case 'in_investigation':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'response_drafted':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'final_response_issued':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'closed':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'awaiting_customer':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'escalated':
        return 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20'
      default:
        return 'bg-app text-text-secondary border-border'
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(
        normalized
      )} ${className}`}
    >
      {displayLabel}
    </span>
  )
}
