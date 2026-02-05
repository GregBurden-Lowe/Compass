# FCA DISP Implementation Plan — Compass Complaints

**Scope:** All PARTIAL/FAIL items from `FCA_DISP_COMPLIANCE_REVIEW.md`.  
**Principle:** Additive only; feature flags default OFF; no breaking changes.

---

## 1) Requirement → code change mapping

| Req | Status | Code changes |
|-----|--------|--------------|
| **A.3** Vulnerability/support structured | PARTIAL | Add `Complaint.support_needs` JSON (nullable). Optional "Support needs" UI section (checkboxes + preferred contact). Behind `ENABLE_SUPPORT_NEEDS`. |
| **B.2** Keep informed | PARTIAL | Add communication kind `progress_update`; "Send Progress Update" button with prefilled template. Optional in-app nudge when `ENABLE_DEADLINE_NOTIFICATIONS` (banner if no outbound in X days). |
| **B.3** Prevent silent handling | PARTIAL | When `REQUIRE_OUTBOUND_BEFORE_CLOSE` true: on close, validate at least one outbound Communication (or ack/delay/final comm). Frontend message when flag on. |
| **C.1** received_at immutable/audited | FAIL | PATCH complaint: on `received_at` change write AuditLog (received_at, ack_due_at, final_due_at old/new); add ComplaintEvent `received_at_corrected` with details. |
| **C.3** Escalation/alerts | PARTIAL | Use existing overdue/breach UI; when `ENABLE_DEADLINE_NOTIFICATIONS` add in-app banner/digest. No email job by default. |
| **C.5** Outbound comms evidence | PARTIAL | Add `Communication.body` (TEXT). Store full body on add; keep summary for lists. Attachment: add `sha256`, `size_bytes` (when `ENABLE_ATTACHMENT_HASHING`); soft delete with AuditLog. |
| **D / D1.*** Final response content + guardrails | PARTIAL/FAIL | Add `Communication.body`, `d1_checklist_confirmed` (JSON), `confirmed_in_attachment` (bool). Server-side D1 template constants + `WAIVER_STATEMENT_TEXT` config. When `REQUIRE_D1_CHECKLIST`: require checklist complete or confirmed_in_attachment + attachment. Frontend: D1 checklist UI when final response + flag. |
| **E.1/E.2/E.3** Broker referral | FAIL | Add `BrokerReferral` table; `POST /complaints/{id}/broker-referral`; ComplaintEvent + AuditLog. Behind `ENABLE_BROKER_REFERRAL`. Frontend: "Refer to broker" when Sales + flag. |
| **F.2** AuditLog population | PARTIAL | Helper `audit_change(db, complaint_id, entity, field, old, new, user_id)`. Call from PATCH (key fields), received_at path, attachment delete, broker referral. |
| **F.3** Retention + legal hold | FAIL | Add `Complaint.legal_hold`, `Complaint.retention_until`. On close set `retention_until = closed_at + 6 years` unless legal_hold. Admin endpoint to set legal_hold/retention_until. |
| **F.4** RBAC vulnerability notes | PARTIAL | When `RESTRICT_VULNERABILITY_NOTES`: GET omit `vulnerability_notes` for non-allowed roles; PATCH reject updates to vulnerability_notes. Allowed role: admin, complaints_manager (configurable). Frontend hide/readonly by permission. |
| **Path #1 evidence gap** | — | POST `/final-response` already creates Communication via `issue_final_response_with_communication`. Add optional body `{ confirmed_sent_externally, external_send_reason }`; when `REQUIRE_FINAL_RESPONSE_EVIDENCE` require evidence (attachment path or external reason). |

---

## 2) Feature flags (config)

All in `backend/app/core/config.py`, env vars, default **False** / **0**:

- `REQUIRE_FINAL_RESPONSE_EVIDENCE`
- `REQUIRE_D1_CHECKLIST`
- `REQUIRE_OUTBOUND_BEFORE_CLOSE`
- `ENABLE_DEADLINE_NOTIFICATIONS`
- `ENABLE_SUPPORT_NEEDS`
- `ENABLE_DELAY_RESPONSE_KIND`
- `ENABLE_BROKER_REFERRAL`
- `ENABLE_ATTACHMENT_HASHING`
- `RESTRICT_VULNERABILITY_NOTES`
- `WAIVER_STATEMENT_TEXT` (string, optional)
- `D1_FOS_WEBSITE_URL` (string, optional)
- `NO_OUTBOUND_DAYS_WARNING` (int, days for "no outbound comm" nudge when ENABLE_DEADLINE_NOTIFICATIONS)

---

## 3) Implementation order

0. Final response evidence (Communication always; optional body + evidence when flag)  
1. D1 checklist + guardrails (fields, validation, template, frontend checklist)  
2. received_at audit + AuditLog helper + due-date event  
3. Delay response kind + template + overdue banner  
4. Broker referral (table, endpoint, event, audit, frontend)  
5. Communication.body; Attachment sha256/size + soft delete + audit  
6. Retention/legal_hold on Complaint + close logic + admin endpoint  
7. Vulnerability RBAC (serializer + PATCH reject)  
8. Progress update template + nudge (when flag)  
9. Support needs (support_needs JSON + UI)  
10. REQUIRE_OUTBOUND_BEFORE_CLOSE validation on close  
11. AuditLog population (helper + use in PATCH, delete, referral)

---

## 4) Files to add/change (summary)

- **Config:** `backend/app/core/config.py` — flags + waiver/FOS URLs  
- **Migrations:** one new migration (Communication, Attachment, Complaint, BrokerReferral)  
- **Models:** `Communication` (body, d1_checklist_confirmed, confirmed_in_attachment); `Attachment` (sha256, size_bytes, deleted_at, deleted_by_id, delete_reason); `Complaint` (legal_hold, retention_until, support_needs); `BrokerReferral` (new)  
- **Services:** `complaints.py` — audit_change, issue_final_response_with_communication (evidence when flag), D1 validation helper, delay template, broker referral, close retention, outbound check  
- **API:** complaints.py — final-response optional body; PATCH audit received_at; broker-referral endpoint; close validation; attachment delete soft + audit; config/features endpoint for frontend  
- **Frontend:** feature flags from API; D1 checklist in Add Communication / Issue Final Response; Delay Response button; Refer to broker; Progress Update; Support needs section; vulnerability permission; outbound-before-close message  
- **Tests:** integration for final-response Communication, received_at audit, D1 (flag), delay response, broker referral, retention on close, attachment hash/delete audit, outbound before close, vulnerability RBAC

---

## 5) Post-change compliance matrix (expected status)

After implementing the above (flags default OFF; when flags enabled as noted):

| Requirement | Before | After (flags OFF) | After (flags ON as noted) |
|-------------|--------|-------------------|----------------------------|
| A.3 Vulnerability/support structured | PARTIAL | PARTIAL | PASS when ENABLE_SUPPORT_NEEDS: support_needs JSON + UI |
| B.2 Keep informed | PARTIAL | PARTIAL | PARTIAL: progress_update kind + template; nudge when ENABLE_DEADLINE_NOTIFICATIONS |
| B.3 Prevent silent handling | PARTIAL | PARTIAL | PASS when REQUIRE_OUTBOUND_BEFORE_CLOSE: close blocked without outbound |
| C.1 received_at immutable/audited | FAIL | **PASS** | **PASS**: AuditLog + received_at_corrected event + due date deltas |
| C.3 Escalation/alerts | PARTIAL | PARTIAL | PARTIAL: in-app banner/digest when ENABLE_DEADLINE_NOTIFICATIONS |
| C.5 Outbound comms evidence | PARTIAL | PARTIAL | PARTIAL: Communication.body; Attachment sha256/size when ENABLE_ATTACHMENT_HASHING; soft delete + audit |
| D / D1.* Final response content | PARTIAL/FAIL | PARTIAL | **PASS** when REQUIRE_D1_CHECKLIST: checklist or confirmed_in_attachment; template/placeholders |
| E.1/E.2/E.3 Broker referral | FAIL | PARTIAL (model + API exist, feature hidden) | **PASS** when ENABLE_BROKER_REFERRAL: workflow + BrokerReferral + event + audit |
| F.2 AuditLog population | PARTIAL | **PASS** | **PASS**: audit_change used for received_at, attachment delete, broker referral |
| F.3 Retention + legal hold | FAIL | **PASS** | **PASS**: legal_hold, retention_until set on close; admin endpoint for hold |
| F.4 RBAC vulnerability notes | PARTIAL | PARTIAL | **PASS** when RESTRICT_VULNERABILITY_NOTES: notes hidden/rejected by role |
| Path #1 evidence gap | — | **FIXED** | **FIXED**: POST /final-response always creates Communication |

---

## 6) Files changed / migrations / flags summary

### Files changed
- **Config:** `backend/app/core/config.py` — feature flags + waiver/FOS URLs
- **Migrations:** `backend/app/migrations/versions/0017_fca_disp_compliance_fields.py` — Communication (body, d1_checklist_confirmed, confirmed_in_attachment), Attachment (sha256, size_bytes, deleted_at, deleted_by_id, delete_reason), Complaint (legal_hold, retention_until, support_needs), table broker_referral
- **Models:** `communication.py` (body, d1_checklist_confirmed, confirmed_in_attachment), `attachment.py` (sha256, size_bytes, soft delete fields), `complaint.py` (legal_hold, retention_until, support_needs, broker_referrals), `broker_referral.py` (new)
- **Services:** `complaints.py` — audit_change, validate_d1_checklist, get_d1_template_body, get_delay_response_template, issue_final_response_with_communication (evidence/D1 params), add_communication_with_attachments (body, d1, sha256/size), close_complaint (retention_until, REQUIRE_OUTBOUND_BEFORE_CLOSE), soft_delete_attachment, create_broker_referral, _has_outbound_comm
- **API:** `complaints.py` — PATCH received_at audit + event; POST final-response optional body; POST broker-referral; add_communication body/d1/confirmed_in_attachment, hashing; delete attachment → soft delete; get/list complaint _mask_vulnerability_notes_if_restricted; PATCH reject vulnerability_notes when restricted
- **API:** `config.py` (new) — GET /config/features
- **Router:** `router.py` — include config router
- **Schemas:** `complaint.py` — FinalResponseRequest, BrokerReferralCreate, BrokerReferralOut; CommunicationOut (body, d1_checklist_confirmed, confirmed_in_attachment); ComplaintOut (legal_hold, retention_until, support_needs)
- **Frontend:** `types.ts` (FeaturesFlags), `hooks/useFeatures.ts` (new), `ComplaintDetail.tsx` (features, D1 checklist, delay response button, broker referral modal, progress_update/delay_response_8week kind options)
- **Tests:** `test_fca_disp.py` (new) — final response creates comm, received_at audit, retention on close, broker referral, soft delete audit

### Migrations added
- `0017_fca_disp_compliance_fields.py` (revision 0017_fca_disp, down_revision 0016_add_communication_kind)

### Feature flags and defaults (all default OFF)
| Flag | Default | Env |
|------|---------|-----|
| REQUIRE_FINAL_RESPONSE_EVIDENCE | false | REQUIRE_FINAL_RESPONSE_EVIDENCE |
| REQUIRE_D1_CHECKLIST | false | REQUIRE_D1_CHECKLIST |
| REQUIRE_OUTBOUND_BEFORE_CLOSE | false | REQUIRE_OUTBOUND_BEFORE_CLOSE |
| ENABLE_DEADLINE_NOTIFICATIONS | false | ENABLE_DEADLINE_NOTIFICATIONS |
| ENABLE_SUPPORT_NEEDS | false | ENABLE_SUPPORT_NEEDS |
| ENABLE_DELAY_RESPONSE_KIND | false | ENABLE_DELAY_RESPONSE_KIND |
| ENABLE_BROKER_REFERRAL | false | ENABLE_BROKER_REFERRAL |
| ENABLE_ATTACHMENT_HASHING | false | ENABLE_ATTACHMENT_HASHING |
| RESTRICT_VULNERABILITY_NOTES | false | RESTRICT_VULNERABILITY_NOTES |
| WAIVER_STATEMENT_TEXT | "" | WAIVER_STATEMENT_TEXT |
| D1_FOS_WEBSITE_URL | https://www.financial-ombudsman.org.uk | D1_FOS_WEBSITE_URL |
| NO_OUTBOUND_DAYS_WARNING | 14 | NO_OUTBOUND_DAYS_WARNING |

### Test coverage added
- `backend/app/tests/test_fca_disp.py`: final response creates Communication, received_at audit + event, close sets retention_until, broker referral creates record + event, soft_delete_attachment audit. (Run with `pytest app/tests/test_fca_disp.py` after ensuring `storage/attachments` exists or mocking app mount.)
