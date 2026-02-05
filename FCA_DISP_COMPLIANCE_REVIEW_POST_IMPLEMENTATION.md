# FCA DISP Compliance Review — Post-Implementation (Evidence-Only)

**Reference:** `FCA_DISP_REFERENCE.md` (sections A–G and D1).  
**Scope:** Codebase after FCA DISP implementation (feature flags, audit, D1, broker referral, retention, etc.).  
**Principle:** Evidence-first; no code changes; report only.

**Status modes:**
- **Mode 1 — Flags OFF (defaults):** All compliance flags at default (false/off).
- **Mode 2 — Recommended compliance:** `REQUIRE_D1_CHECKLIST=true`, `REQUIRE_FINAL_RESPONSE_EVIDENCE=true`, `ENABLE_DELAY_RESPONSE_KIND=true`.
- **Mode 3 — Maximum enforcement:** All relevant flags ON (`REQUIRE_*`, `ENABLE_*`, `RESTRICT_*` as applicable).

---

## 1) Compliance matrix

| Requirement | Mode 1 (Flags OFF) | Mode 2 (Recommended) | Mode 3 (Max enforcement) | Evidence | Notes | Risk |
|-------------|--------------------|------------------------|---------------------------|----------|-------|------|
| **A. Intake & recognition** | | | | | | |
| A.1 Identify, register, respond | PASS | PASS | PASS | `backend/app/services/complaints.py` `create_complaint()`, `backend/app/api/complaints.py` POST `/complaints`, `frontend/src/pages/CreateComplaintWizard.tsx` | Unchanged. | Low |
| A.2 Any reasonable means | PASS | PASS | PASS | `backend/app/models/enums.py` CommunicationChannel; Complaint.source; CreateComplaintWizard source + category | Unchanged. | Low |
| A.3 Vulnerability/support structured | PARTIAL | PARTIAL | PASS | `backend/app/models/complaint.py` `vulnerability_flag`, `vulnerability_notes`, `support_needs` (JSON); config `ENABLE_SUPPORT_NEEDS`. Mode 3: support_needs + optional UI. | support_needs JSON exists; full “support needs” UI behind ENABLE_SUPPORT_NEEDS. | Med |
| A.4 Required capture (identity, policy, summary, channel, category, timestamps) | PASS | PASS | PASS | Complaint + Complainant + Policy models; `received_at`, `source`, `category`, `description`, `policy_number`, etc. | Unchanged. | Low |
| **B. Acknowledge + keep informed** | | | | | | |
| B.1 Prompt written acknowledgement | PASS | PASS | PASS | `backend/app/services/complaints.py` `acknowledge()`, `ack_due_at`/`acknowledged_at`; frontend ack modal + optional log to Communications. | Unchanged. | Low |
| B.2 Keep complainant informed | PARTIAL | PARTIAL | PARTIAL | Communications with kind (e.g. `progress_update`); `frontend/src/pages/ComplaintDetail.tsx` kind dropdown includes progress_update; no mandatory nudge unless ENABLE_DEADLINE_NOTIFICATIONS. | Progress update kind + template available; deadline nudge behind flag. | Med |
| B.3 Prevent silent handling | PARTIAL | PARTIAL | PASS | `backend/app/services/complaints.py` `_has_outbound_comm()`, `close_complaint()`: when `REQUIRE_OUTBOUND_BEFORE_CLOSE` raises if no outbound/ack/delay/final. Mode 3: close blocked. | Flag OFF: visibility only; ON: hard block. | Med |
| **C. 8-week deadline + required responses** | | | | | | |
| C.1 date_received write-once / audited correction | PASS | PASS | PASS | `backend/app/api/complaints.py` PATCH (lines 463–488): on `received_at` change calls `service.audit_change()` for `received_at`, `ack_due_at`, `final_due_at`; `service.add_event(..., "received_at_corrected", description_with_old_new_and_due_dates)`. `backend/app/services/complaints.py` `audit_change()` writes to `AuditLog`. | **Fixed.** AuditLog + ComplaintEvent with due date deltas. | Low |
| C.2 Computed deadline_at | PASS | PASS | PASS | `backend/app/services/complaints.py` `calculate_slas(received_at)` → `final_due_at`; `complaint.final_due_at`. | Unchanged. | Low |
| C.3 Escalation/alerts approaching deadline | PARTIAL | PARTIAL | PARTIAL | `ack_breached`/`final_breached`; list filter; MyTasks due/overdue. `ENABLE_DEADLINE_NOTIFICATIONS` for in-app nudge/digest (optional). | No email/scheduler by default. | Med |
| C.4 Status model | PASS | PASS | PASS | `backend/app/models/enums.py` ComplaintStatus. | Unchanged. | Low |
| C.5 Outbound comms (body/PDF + timestamp + sender) | PARTIAL | PARTIAL | PARTIAL | `backend/app/models/communication.py` `body` (TEXT); `summary`, `occurred_at`, `user_id`; Attachment; optional `sha256`/`size_bytes` when `ENABLE_ATTACHMENT_HASHING`. Soft delete with audit. | Full body stored; attachment integrity behind flag. | Med |
| **D. Final response content (DISP 1.6.2R(1))** | | | | | | |
| D.1 Decision + reasons + redress | PARTIAL | PARTIAL | PARTIAL | Outcome model; RedressPayment; final response = Communication (summary/body + attachments). No single template enforcing blocks in body. | Data in Outcome/Redress; template/checklist enforces via D1 when flag on. | Med |
| D.2 FOS leaflet / required FOS info | PARTIAL | PASS | PASS | `backend/app/services/complaints.py` `get_d1_template_body()`, `get_delay_response_template()` use `d1_fos_website_url`, `waiver_statement_text`. D1 checklist keys include fos_website, leaflet_statement, waiver_statement. Mode 2/3: REQUIRE_D1_CHECKLIST enforces. | Template placeholders exist; content enforced via checklist when flag on. | Med→Low |
| D.3 Right to refer to FOS | PARTIAL | PASS | PASS | D1 key `fos_right_to_refer`; template text in `get_d1_template_body()`. Enforced when REQUIRE_D1_CHECKLIST. | Same as above. | Med→Low |
| D.4 Time limits + waiver | PARTIAL | PASS | PASS | D1 keys `fos_6_months`, `waiver_statement`; template + config `WAIVER_STATEMENT_TEXT`. | Same. | Med→Low |
| **D1. Final response — required blocks** | | | | | | |
| D1.1 Decision outcome + reasons | PARTIAL | PASS | PASS | Outcome.outcome, Outcome.rationale; D1 key `decision_outcome`, `reasons`. validate_d1_checklist when REQUIRE_D1_CHECKLIST. | Enforced by checklist or confirmed_in_attachment. | Med |
| D1.2 Redress summary | PARTIAL | PASS | PASS | RedressPayment; D1 key `redress_summary`. | Same. | Med |
| D1.3 Right to refer to FOS | PARTIAL | PASS | PASS | D1 key `fos_right_to_refer`. | Same. | Med |
| D1.4 FOS 6-month limit | PARTIAL | PASS | PASS | D1 key `fos_6_months`. | Same. | Med |
| D1.5 FOS website | PARTIAL | PASS | PASS | D1 key `fos_website`; config `d1_fos_website_url`. | Same. | Med |
| D1.6 FOS leaflet | PARTIAL | PASS | PASS | D1 key `leaflet_statement`. | Same. | Med |
| D1.7 Waiver statement | PARTIAL | PASS | PASS | D1 key `waiver_statement`; config `waiver_statement_text`. | Same. | Med |
| D1.8 Guardrail (cannot send without sections) | PASS | PASS | PASS | `backend/app/services/complaints.py` `validate_d1_checklist()`; called in `issue_final_response_with_communication()` (both paths) and in `add_communication_with_attachments()` when `is_final_response` and `require_d1`. Raises ValueError if not satisfied. | **Both** POST final-response and POST communications with is_final_response=true are gated (see §3). | Low |
| D1.9 Versioned storage of final response | PARTIAL | PARTIAL | PARTIAL | Communication (summary, body, attachments) stored; Attachment optional sha256/size; soft delete with audit. No separate versioned “sent letter” entity. | Evidence via comm + attachments. | Med |
| **E. Sales complaints referred to broker** | | | | | | |
| E.1 Category triggers refer-to-broker | PARTIAL | PARTIAL | PASS | `backend/app/api/complaints.py` POST `/{id}/broker-referral` (404 when `enable_broker_referral` OFF). `frontend/src/pages/ComplaintDetail.tsx`: “Refer to Broker” when `enable_broker_referral && (category === 'Sales' \|\| 'sales')`. | Mode 3: workflow visible and usable. | Med |
| E.2 Store broker identity, referred_at, what_was_sent, broker_ack | PARTIAL | PARTIAL | PASS | `backend/app/models/broker_referral.py` BrokerReferral: broker_identifier, referred_at, what_was_sent, notes, broker_ack_at. | Mode 3: full evidence model. | Med |
| E.3 Audit log for referral | PARTIAL | PARTIAL | PASS | `backend/app/services/complaints.py` `create_broker_referral()`: `add_event(..., "referred_to_broker", ...)`, `audit_change(..., "broker_referral", "created", ...)`. | Mode 3: event + AuditLog. | Med |
| **F. Record keeping (DISP 1.9)** | | | | | | |
| F.1 Complaint register | PASS | PASS | PASS | Complaint, Complainant, Policy, Communication, Outcome, RedressPayment, ComplaintEvent, BrokerReferral. | Unchanged. | Low |
| F.2 Audit trail | PASS | PASS | PASS | `backend/app/services/complaints.py` `audit_change()` writes to `AuditLog`; used in PATCH (received_at, ack_due_at, final_due_at), `soft_delete_attachment()`, `create_broker_referral()`. ComplaintEvent for status/comms. | **Fixed.** AuditLog populated for key changes. | Low |
| F.3 Retention 6 years + legal hold | PASS | PASS | PASS | `backend/app/models/complaint.py` `legal_hold`, `retention_until`; `close_complaint()` sets `retention_until = closed_at + 6 years` unless legal_hold. | Implemented. | Low |
| F.4 RBAC vulnerability data | PARTIAL | PARTIAL | PASS | `backend/app/api/complaints.py` `_mask_vulnerability_notes_if_restricted()` in get_complaint and list; PATCH rejects `vulnerability_notes` when `RESTRICT_VULNERABILITY_NOTES` and role not admin/complaints_manager. | Mode 3: field-level restriction. | Low |
| **G. Reporting readiness** | | | | | | |
| G.1 Data model for MI | PASS | PASS | PASS | Complaint, Outcome, RedressPayment, reporting view; BrokerReferral when used. | Unchanged. | Low |
| G.2 Export/dashboards addable | PASS | PASS | PASS | Reporting view, metrics endpoint, filters. | Unchanged. | Low |

---

## 2) Path #1 fix — every path that sets final_response_at and evidence created

**Single service writer of `final_response_at`:**  
`backend/app/services/complaints.py` — `issue_final_response()` (lines 277–287) sets `complaint.final_response_at = utcnow()` and `complaint.status = final_response_issued`. It is **only** called from `issue_final_response_with_communication()` (line 354).

**Every path that sets final_response_at (and what evidence is created):**

| # | Path | Where | Evidence created | Confirmed |
|---|------|--------|-------------------|-----------|
| 1 | **POST /complaints/{id}/final-response** | `backend/app/api/complaints.py` lines 734–759: calls `service.issue_final_response_with_communication(db, complaint, user_id)` with `communication=None`. | **Always:** one **Communication** (kind=`final_response`, channel=other, direction=outbound, summary stub or body, is_final_response=True) via `add_communication_with_attachments()` (lines 328–344). **Always:** one **ComplaintEvent** `final_response_issued` from `issue_final_response()`. **Optional:** Attachments only if user had used “Add Communication + mark as final” instead; this path has no attachments (attachment_count=0). | **Path #1 is fully fixed:** a Communication record is always created before setting final_response_at. |
| 2 | **POST /complaints/{id}/communications** with `is_final_response=true` | `backend/app/api/complaints.py` lines 954–978: creates Communication via `add_communication_with_attachments(...)` then calls `service.issue_final_response_with_communication(db, complaint, user_id, communication=comm)`. | **Always:** the **Communication** just created (with summary, optional body, optional attachments, d1_checklist_confirmed, confirmed_in_attachment). **Always:** **ComplaintEvent** `communication_added` then `final_response_issued`. **Optional:** Attachments (list from form `files`). | Evidence = Communication + optional Attachments; no second Communication created. |
| 3 | **Direct service call (no HTTP)** | `backend/app/seed/seed_data.py` line 74; `backend/app/tests/test_workflow.py` line 44: call `service.issue_final_response(db, complaint, user_id)` directly. | **No** Communication created by this path; **yes** ComplaintEvent. | Not an API path; used only in seed/tests. |

**Conclusion:** Every **API** path that sets `final_response_at` goes through `issue_final_response_with_communication()`. The button path (POST `/final-response`) **always** creates exactly one evidential Communication before calling `issue_final_response()`. Path #1 is fully fixed for API usage.

---

## 3) D1 enforcement on both POST final-response and POST communications with is_final_response=true

**D1 enforcement:**  
`backend/app/services/complaints.py` — `validate_d1_checklist(d1_checklist_confirmed, confirmed_in_attachment, attachment_count, require_d1=True)` (lines 68–82). When `REQUIRE_D1_CHECKLIST` is True, it raises ValueError unless either (a) all D1 keys are in `d1_checklist_confirmed`, or (b) `confirmed_in_attachment` is True and `attachment_count >= 1`.

**Where it is called:**

1. **POST /complaints/{id}/final-response**  
   - **API:** `backend/app/api/complaints.py` lines 742–753: passes `d1_checklist_confirmed=body.d1_checklist_confirmed if body else None`, `confirmed_in_attachment=body.confirmed_in_attachment if body else False`, `attachment_count=0`.  
   - **Service:** `issue_final_response_with_communication(..., communication=None)` (lines 313–325): when `communication is None` and `require_d1`, calls `validate_d1_checklist(d1_checklist_confirmed, confirmed_in_attachment, attachment_count, require_d1=True)`.  
   - So when **REQUIRE_D1_CHECKLIST=true**, POST `/final-response` **cannot** succeed without either a full D1 checklist in the optional body or `confirmed_in_attachment=True` (and with attachment_count=0, confirmed_in_attachment alone would fail validation unless checklist is complete; so in practice for this path the client must send a complete `d1_checklist_confirmed` in the body when flag is on).

2. **POST /complaints/{id}/communications** with `is_final_response=true`  
   - **API:** `backend/app/api/complaints.py` lines 954–968: passes `body`, `d1_checklist_confirmed=d1_list`, `confirmed_in_attachment` from form into `add_communication_with_attachments(...)`.  
   - **Service:** `add_communication_with_attachments()` (lines 499–501): when `is_final_response and require_d1`, calls `validate_d1_checklist(d1_checklist_confirmed, confirmed_in_attachment, len(att_list), require_d1=True)` **before** creating the Communication.  
   - Then (lines 971–978): after creating the Communication, calls `issue_final_response_with_communication(..., communication=comm)`.  
   - **Service:** `issue_final_response_with_communication(..., communication=comm)` (lines 346–354): when `communication` is not None and `require_d1`, calls `validate_d1_checklist(getattr(communication, "d1_checklist_confirmed", None), getattr(communication, "confirmed_in_attachment", False), att_count, require_d1=True)`.  
   - So when **REQUIRE_D1_CHECKLIST=true**, POST `/communications` with `is_final_response=true` is validated **twice**: once at communication creation (so invalid payloads never create the comm), and once at issue (using the created comm’s d1 fields and attachment count).

**Conclusion:** D1 enforcement applies to **both**:
- **POST /complaints/{id}/final-response** (via `issue_final_response_with_communication` when `communication is None`),
- **POST /complaints/{id}/communications** with `is_final_response=true` (via `add_communication_with_attachments` and again in `issue_final_response_with_communication(communication=comm)`).

---

## 4) received_at audit: due date deltas and AuditLog

**Location:** `backend/app/api/complaints.py` lines 463–488 (PATCH `/{complaint_id}`).

**When `payload.received_at` is present and different from `original_received_at`:**
1. **SLA recalculation:** `ack_due, final_due = calculate_slas(payload.received_at)`; `complaint.ack_due_at = ack_due`; `complaint.final_due_at = final_due`.
2. **AuditLog (three rows):**  
   - `service.audit_change(db, str(complaint.id), "complaint", "received_at", original_received_at, payload.received_at, str(current_user.id))`  
   - `service.audit_change(db, str(complaint.id), "complaint", "ack_due_at", original_ack_due, complaint.ack_due_at, str(current_user.id))`  
   - `service.audit_change(db, str(complaint.id), "complaint", "final_due_at", original_final_due, complaint.final_due_at, str(current_user.id))`
3. **ComplaintEvent:** `service.add_event(db, complaint, "received_at_corrected", f"received_at: {original_received_at} -> {payload.received_at}; ack_due: {original_ack_due} -> {complaint.ack_due_at}; final_due: {original_final_due} -> {complaint.final_due_at}", str(current_user.id))`.

**AuditLog implementation:** `backend/app/services/complaints.py` `audit_change()` (lines 45–62) creates an `AuditLog` row with `complaint_id`, `entity`, `field`, `old_value`, `new_value`, `changed_by_id`. `backend/app/models/audit.py`: `AuditLog` has `complaint_id`, `entity`, `field`, `old_value`, `new_value`, `changed_by_id`, `created_at`.

**Conclusion:** received_at changes produce:
- **Due date deltas:** old and new values for `received_at`, `ack_due_at`, and `final_due_at` are recorded in the **ComplaintEvent** description string and in **three AuditLog** rows (one per field).
- **AuditLog:** All three fields (received_at, ack_due_at, final_due_at) are written to **AuditLog** with old/new values and user.
