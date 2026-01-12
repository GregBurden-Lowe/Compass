export type UserRole = 'admin' | 'complaints_handler' | 'complaints_manager' | 'reviewer' | 'read_only'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  mfa_enabled: boolean
  must_change_password?: boolean
  created_at: string
  last_login?: string
}

export interface LoginResponse {
  access_token: string
  expires_at: string
  mfa_enrollment_required: boolean
  mfa_remaining_skips: number
  must_change_password?: boolean
}

export interface ReferenceItem {
  id: string
  name: string
  created_at: string
}

export interface Metrics {
  counts: { total: number; open: number; closed: number }
  sla: { ack_on_time_pct: number | null; final_on_time_pct: number | null; open_breaches: number }
  cycles: {
    median_ack_days: number | null
    median_close_days: number | null
    mean_close_days: number | null
    median_investigation_days: number | null
  }
  workload: {
    open_by_handler: Record<string, number>
    new_this_week: number
    closed_this_week: number
    aging_buckets: Record<string, number>
  }
  outcomes: {
    counts: Record<string, number>
    pct: Record<string, number>
    redress: { monetary_sum: number; monetary_avg: number; non_monetary_count: number }
  }
  stages: Record<string, number>
  vulnerability: { open_vulnerable: number; open_vulnerable_pct: number | null }
  channels_last_30d: Record<string, number>
  reopens: { reopened: number; reopen_rate_pct: number | null; escalated: number }
  attachments: { final_attachment_pct_open: number | null }
}

export type ComplaintStatus =
  | 'New'
  | 'Acknowledged'
  | 'In Investigation'
  | 'Response Drafted'
  | 'Final Response Issued'
  | 'Closed'
  | 'Reopened'

export interface Complainant {
  id: string
  full_name: string
  email?: string
  phone?: string
  address?: string
}

export interface Complaint {
  id: string
  reference: string
  status: ComplaintStatus
  assigned_handler_id?: string | null
  assigned_handler_name?: string | null
  category: string
  reason?: string
  description: string
  source: string
  received_at: string
  ack_due_at: string
  final_due_at: string
  acknowledged_at?: string
  final_response_at?: string
  closed_at?: string
  ack_breached: boolean
  final_breached: boolean
  is_escalated: boolean
  non_reportable: boolean
  product?: string
  scheme?: string
  broker?: string
  insurer?: string
  policy_number?: string
  vulnerability_flag: boolean
  vulnerability_notes?: string
  fca_complaint?: boolean
  fos_complaint?: boolean
  fos_reference?: string
  fos_referred_at?: string
  policy?: {
    policy_number?: string
    product?: string
    insurer?: string
    broker?: string
    scheme?: string
  }
  complainant: Complainant
  redress_payments?: RedressPayment[]
  outcome?: Outcome
  communications?: Communication[]
  events?: ComplaintEvent[]
  reopened_at?: string
}

export interface CreateComplaintPayload {
  source: string
  received_at: string
  description: string
  category: string
  reason?: string
  fca_complaint: boolean
  fca_rationale?: string
  vulnerability_flag: boolean
  vulnerability_notes?: string
  policy_number?: string
  insurer?: string
  broker?: string
  product?: string
  scheme?: string
  complainant: {
    full_name: string
    email?: string
    phone?: string
    address?: string
  }
  policy: {
    policy_number?: string
    insurer?: string
    broker?: string
    product?: string
    scheme?: string
  }
}

export interface Outcome {
  id: string
  outcome: string
  rationale?: string
  notes?: string
  recorded_at?: string
}

export interface RedressPayment {
  id: string
  amount?: number
  payment_type: string
  status: string
  rationale?: string
  action_description?: string
  action_status?: string
  approved?: boolean
  notes?: string
  paid_at?: string
  created_at?: string
}

export interface Communication {
  id: string
  channel: string
  direction: string
  summary: string
  occurred_at: string
  created_at: string
  attachments?: Attachment[]
  is_final_response?: boolean
  is_internal?: boolean
}

export interface Attachment {
  id: string
  file_name: string
  url: string
  content_type: string
}

export interface ComplaintEvent {
  id: string
  event_type: string
  description?: string
  created_at: string
  created_by_id?: string
  created_by_name?: string
}
