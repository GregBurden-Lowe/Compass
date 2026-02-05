import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { FeaturesFlags } from '../types'

const defaultFlags: FeaturesFlags = {
  require_final_response_evidence: false,
  require_d1_checklist: false,
  require_outbound_before_close: false,
  enable_deadline_notifications: false,
  enable_support_needs: false,
  enable_delay_response_kind: false,
  enable_broker_referral: false,
  enable_attachment_hashing: false,
  restrict_vulnerability_notes: false,
  no_outbound_days_warning: 14,
}

export function useFeatures(): FeaturesFlags {
  const [features, setFeatures] = useState<FeaturesFlags>(defaultFlags)
  useEffect(() => {
    api
      .get<FeaturesFlags>('/config/features')
      .then((res) => setFeatures({ ...defaultFlags, ...res.data }))
      .catch(() => {})
  }, [])
  return features
}

/** D1 checklist keys required when REQUIRE_D1_CHECKLIST is on (must match backend D1_REQUIRED_KEYS) */
export const D1_CHECKLIST_KEYS = [
  'decision_outcome',
  'reasons',
  'redress_summary',
  'fos_right_to_refer',
  'fos_6_months',
  'fos_website',
  'leaflet_statement',
  'waiver_statement',
]
