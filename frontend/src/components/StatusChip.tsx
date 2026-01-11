import { ComplaintStatus } from '../types'

interface StatusChipProps {
  status: ComplaintStatus
  className?: string
}

export function StatusChip({ status, className = '' }: StatusChipProps) {
  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case 'New':
        return 'bg-semantic-info/10 text-semantic-info border-semantic-info/20'
      case 'Acknowledged':
        return 'bg-semantic-success/10 text-semantic-success border-semantic-success/20'
      case 'In Investigation':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Response Drafted':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Awaiting Customer':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'Escalated':
        return 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20'
      case 'Closed':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-app text-text-secondary border-border'
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(
        status
      )} ${className}`}
    >
      {status}
    </span>
  )
}
