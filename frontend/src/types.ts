export type UserRole = 'admin' | 'complaints_handler' | 'complaints_manager' | 'reviewer' | 'read_only'

// ── Root Cause Taxonomy ──────────────────────────────────────────────────────
// Plain string values mirroring backend enums.ROOT_CAUSE_CATEGORIES.
// Add new causes here AND in backend/app/models/enums.py — no DB migration needed.

export const ROOT_CAUSE_CATEGORIES: Record<string, string[]> = {
  'Communication & Service': [
    'delay_in_response',
    'unclear_communication',
    'staff_conduct',
    'failure_to_update_customer',
    'inaccessible_service',
  ],
  'Claims Handling': [
    'incorrectly_declined',
    'settlement_undervalued',
    'delay_in_handling',
    'incorrect_exclusion_applied',
    'excessive_information_requests',
  ],
  'Policy Administration': [
    'incorrect_documentation',
    'incorrect_premium',
    'policy_set_up_incorrectly',
    'renewal_error',
    'cancellation_lapse_error',
  ],
  'Sales & Distribution': [
    'unsuitable_product',
    'incorrect_information_at_sale',
    'failure_to_disclose_terms',
    'needs_not_assessed',
  ],
  'Underwriting & Risk': [
    'incorrect_risk_assessment',
    'incorrect_loading_or_exclusion',
    'unjustified_decline',
  ],
  'Systems & Process': [
    'system_it_failure',
    'process_gap',
    'data_document_error',
  ],
  'Third Party': [
    'broker_intermediary_error',
    'third_party_supplier_failure',
  ],
  'Vulnerability & Accessibility': [
    'failure_to_identify_vulnerability',
    'failure_to_adapt_service',
    'accessibility_barrier',
  ],
  'Other': ['other'],
}

export const ROOT_CAUSE_LABELS: Record<string, string> = {
  delay_in_response: 'Delay in Response',
  unclear_communication: 'Unclear Communication',
  staff_conduct: 'Staff Conduct',
  failure_to_update_customer: 'Failure to Update Customer',
  inaccessible_service: 'Inaccessible Service',
  incorrectly_declined: 'Incorrectly Declined',
  settlement_undervalued: 'Settlement Undervalued',
  delay_in_handling: 'Delay in Handling',
  incorrect_exclusion_applied: 'Incorrect Exclusion Applied',
  excessive_information_requests: 'Excessive Information Requests',
  incorrect_documentation: 'Incorrect Documentation',
  incorrect_premium: 'Incorrect Premium',
  policy_set_up_incorrectly: 'Policy Set Up Incorrectly',
  renewal_error: 'Renewal Error',
  cancellation_lapse_error: 'Cancellation / Lapse Error',
  unsuitable_product: 'Unsuitable Product',
  incorrect_information_at_sale: 'Incorrect Information at Sale',
  failure_to_disclose_terms: 'Failure to Disclose Terms',
  needs_not_assessed: 'Needs Not Assessed',
  incorrect_risk_assessment: 'Incorrect Risk Assessment',
  incorrect_loading_or_exclusion: 'Incorrect Loading / Exclusion',
  unjustified_decline: 'Unjustified Decline',
  system_it_failure: 'System / IT Failure',
  process_gap: 'Process Gap',
  data_document_error: 'Data / Document Error',
  broker_intermediary_error: 'Broker / Intermediary Error',
  third_party_supplier_failure: 'Third Party Supplier Failure',
  failure_to_identify_vulnerability: 'Failure to Identify Vulnerability',
  failure_to_adapt_service: 'Failure to Adapt Service',
  accessibility_barrier: 'Accessibility Barrier',
  other: 'Other',
}
// ─────────────────────────────────────────────────────────────────────────────

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
  | 'Awaiting Customer'
  | 'Escalated'
  | 'Closed'
  | 'Reopened'

export interface Complainant {
  id: string
  full_name: string
  email?: string
  phone?: string
  address?: string
  date_of_birth?: string
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
  support_needs?: Record<string, any>
  joined_outbound_comm_exists?: boolean
  initial_root_cause?: string | null
  initial_root_cause_description?: string | null
  final_root_cause?: string | null
  final_root_cause_description?: string | null
}

export interface CreateComplaintPayload {
  source: string
  received_at: string
  description: string
  category: string
  reason?: string
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
  kind?: string | null
  channel: string
  direction: string
  summary: string
  occurred_at: string
  created_at: string
  attachments?: Attachment[]
  is_final_response?: boolean
  is_internal?: boolean
}

/** FCA DISP feature flags from GET /api/config/features (all default false) */
export interface FeaturesFlags {
  require_final_response_evidence: boolean
  require_d1_checklist: boolean
  require_outbound_before_close: boolean
  enable_deadline_notifications: boolean
  enable_support_needs: boolean
  enable_delay_response_kind: boolean
  enable_broker_referral: boolean
  enable_attachment_hashing: boolean
  restrict_vulnerability_notes: boolean
  no_outbound_days_warning: number
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

/** Parsed content returned by GET /api/attachments/{id}/preview for EML/MSG files. */
export interface EmailPreview {
  subject: string
  /** Sender address (named `from_` to avoid Python keyword clash in the API). */
  from_: string
  to: string
  cc?: string
  date?: string
  html_body?: string
  plain_body?: string
  has_html: boolean
}
