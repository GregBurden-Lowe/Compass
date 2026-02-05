# FCA DISP Compliance Review — Compass Complaints

**Context:** Insurer as respondent; eligible complainants; 8-week final response regime; vulnerable customer support required; delegated authority (broker referral for sales complaints).  
**Primary source:** `FCA_DISP_REFERENCE.md` (sections A–G and D1).  
**Principle:** Non-destructive; evidence-first; minimal safe remediation only.

---

## 1) Compliance matrix

| Requirement | Status | Evidence | Explanation | Risk |
|-------------|--------|----------|-------------|------|
| **A. Intake & recognition** | | | | |
| A.1 Procedures to identify, register, respond | PASS | `backend/app/services/complaints.py` `create_complaint()`, `backend/app/api/complaints.py` POST `/complaints`, `frontend/src/pages/CreateComplaintWizard.tsx` | Complaint creation with reference, category, source, description; events on create. | Low |
| A.2 Complaints via any reasonable means | PASS | `backend/app/models/enums.py` CommunicationChannel (phone, email, letter, web, third_party, other); Complaint.source; CreateComplaintWizard source + category | Source and channel captured; multiple channels supported. | Low |
| A.3 Vulnerability/support captured (structured) | PARTIAL | `backend/app/models/complaint.py` `vulnerability_flag`, `vulnerability_notes`; auto-set when category = "Vulnerability and Customer Treatment" in `create_complaint` and PATCH | Structured flag + notes exist; no separate "support needs" checklist or influence on comms templates. | Med |
| A.4 Required capture: identity, policy/claim refs, summary, channel, category, timestamps | PASS | Complaint + Complainant + Policy models; `received_at`, `source`, `category`, `description`, `policy_number`, `broker`, etc. | All required fields present; timestamps on complaint and communications. | Low |
| **B. Acknowledge + keep informed** | | | | |
| B.1 Prompt written acknowledgement | PASS | `backend/app/services/complaints.py` `acknowledge()`, `ack_due_at`/`acknowledged_at`; frontend ack modal with email template and optional log to Communications | Ack workflow with due date (2 business days); template in `ComplaintDetail.tsx` (lines ~389–411). | Low |
| B.2 Keep complainant informed of progress | PARTIAL | Communications with kind (e.g. acknowledgement), timeline, events; no dedicated "progress update" template or mandatory update prompts | Progress can be logged via Communications; no explicit "progress update" template or guardrails against silent handling. | Med |
| B.3 Controls to prevent silent handling | PARTIAL | SLA breach flags (`ack_breached`, `final_breached`), overdue filter, MyTasks; no hard block on closing without comms | Visibility of overdue ack/final; no rule that e.g. at least one outbound comm required before close. | Med |
| **C. 8-week deadline + required responses** | | | | |
| C.1 Immutable `date_received` / write-once with audit on correction | FAIL | `backend/app/api/complaints.py` PATCH (lines 439–444): `received_at` is updatable; SLAs recalculated; only generic `add_event(db, complaint, "updated", ...)` | received_at can be changed without dedicated audit event or versioning; DISP requires write-once or audited correction. | High |
| C.2 Computed `deadline_at` | PASS | `final_due_at` = `add_weeks(received_at, 8)` in `calculate_slas()`; `complaints.py` lines 54–59, 78–82 | 8-week deadline computed and stored. | Low |
| C.3 Escalation/alerts when approaching deadline | PARTIAL | `ack_breached`/`final_breached`; list filter `overdue=true`; MyTasks "Final response due soon" / "overdue"; no automated notifications or scheduled jobs | UI shows overdue and due-soon; no email/background alerts or configurable thresholds. | Med |
| C.4 Status model: Open / Investigating / … / Final Response Sent / Closed | PASS | `backend/app/models/enums.py` ComplaintStatus: new, acknowledged, in_investigation, response_drafted, final_response_issued, closed, reopened | Full status flow present. | Low |
| C.5 Outbound comms stored (body/PDF) + sent timestamp + sender | PARTIAL | Communication has `summary`, `occurred_at`, `user_id`; Attachment for files; no full body stored for letter/email (summary only) | Summary + attachments + timestamp; no dedicated "body" field for full letter/email content. | Med |
| **D. Final response content (DISP 1.6.2R(1))** | | | | |
| D.1 Decision + reasons + redress | PARTIAL | Outcome (outcome type, rationale, notes); RedressPayment; final response is a Communication (summary + attachments). No single "final response letter" template with required blocks | Outcome/redress captured; final response content is free-form (summary + attachments), not a structured template. | High |
| D.2 FOS leaflet / required FOS information | FAIL | No FOS leaflet, website URL, 6-month wording, or waiver in code or templates | No FOS content in ack or final response templates; no checklist. | High |
| D.3 Right to refer to FOS | FAIL | Not present in any template or guardrail | Missing. | High |
| D.4 Time limits + waiver (DISP Annex wording) | FAIL | Not present | Missing. | High |
| **D1. Final response — required blocks (template checklist)** | | | | |
| D1.1 Decision outcome (upheld/partially/not upheld) + reasons | PARTIAL | Outcome.outcome, Outcome.rationale; no template block enforcing "reasons" in final response text | Data exists; final response text not tied to outcome blocks. | Med |
| D1.2 Redress/remedy (what we will do, amounts, next steps) | PARTIAL | RedressPayment; no template section for redress wording in final response | Redress recorded; not enforced as a block in final response. | Med |
| D1.3 Right to refer to FOS (clear statement) | FAIL | No template or placeholder | Missing. | High |
| D1.4 FOS time limit (6 months from final response) | FAIL | No template or placeholder | Missing. | High |
| D1.5 FOS website address | FAIL | No template or placeholder | Missing. | High |
| D1.6 FOS leaflet (enclosed/attachment/link) | FAIL | No template or checklist | Missing. | High |
| D1.7 Waiver statement (Annex wording) | FAIL | No template or placeholder | Missing. | High |
| D1.8 Guardrail: cannot send final response without required sections | FAIL | Only checks: outcome exists; optional soft prompt for attachment. No D1 block validation | Can issue final response without any FOS/waiver content. | High |
| D1.9 Versioned storage of exact final response sent | PARTIAL | Communication (summary + attachments) stored; no dedicated "final response body" versioned separately | Evidence via comm + attachments; no explicit versioned "sent letter" entity. | Med |
| **E. Sales complaints referred to broker** | | | | |
| E.1 Category = sales/arranging triggers refer-to-broker workflow | FAIL | CreateComplaintWizard has "Sales" category; no workflow or trigger for "refer to broker" | Sales is a category only; no referral workflow. | High |
| E.2 Store: broker identity, date referred, what was sent, broker ack | FAIL | Complaint.broker is a string (policy/broker ref); no broker_referred_at, referral_notes, or broker_ack | No referral evidence model. | High |
| E.3 Audit log for referral action | FAIL | No referral action or event type | N/A. | High |
| **F. Record keeping (DISP 1.9)** | | | | |
| F.1 Complaint register / DB entries | PASS | Complaint, Complainant, Policy, Communication, Outcome, RedressPayment, ComplaintEvent | Full register. | Low |
| F.2 Audit trail: changes, comms, attachments, decisions | PARTIAL | ComplaintEvent for status/actions; Communication + Attachment; AuditLog model exists but is not written to by complaints API | Event log used; field-level AuditLog not populated; received_at change not specially audited. | Med |
| F.3 Retention: 6 years from closure; legal hold | FAIL | No retention policy or legal_hold flag in schema or jobs | Not implemented. | Med |
| F.4 RBAC for sensitive/vulnerability data | PARTIAL | Role-based API (require_roles); vulnerability_flag/notes in Complaint—no extra restriction on who can see vulnerability_notes | RBAC on endpoints; vulnerability data not additionally restricted. | Low |
| **G. Reporting readiness (DISP 1.10)** | | | | |
| G.1 Data model supports category, product, dates, outcomes, redress, time-to-close, broker refs, vulnerability | PASS | Complaint, Outcome, RedressPayment, reporting view `backend/app/migrations/versions/0012_add_comprehensive_reporting_view.py` | Schema and view support MI; broker referral fields missing. | Low |
| G.2 Export/dashboards addable without reworking schema | PASS | Reporting view, metrics endpoint, filters | Extensible. | Low |

### 1.1 received_at / date_received — all code paths

Every path that **creates** or **modifies** `received_at` (DB column; frontend/API use the same name; there is no separate `date_received` field in code):

| Path type | Endpoint / entry point | Service / handler | UI form / trigger |
|-----------|------------------------|-------------------|-------------------|
| **Create** | `POST /complaints` | `service.create_complaint()` in `backend/app/services/complaints.py` (lines 61–96). Uses `complaint_data["received_at"]`; calls `calculate_slas(complaint_data["received_at"])` and sets `ack_due_at`, `final_due_at` on the new complaint. | **CreateComplaintWizard** `frontend/src/pages/CreateComplaintWizard.tsx`: form field `received_at` (datetime-local, default today); submitted in payload at line 150: `received_at: dayjs(formData.received_at).toISOString()`. |
| **Modify** | `PATCH /complaints/{complaint_id}` | `update_complaint()` in `backend/app/api/complaints.py` (lines 373–469). Reads `original_received_at = complaint.received_at` (line 388); applies `payload.dict(exclude_none=True)` via `setattr(complaint, field, value)` (399–401); then if `payload.received_at and payload.received_at != original_received_at` recalculates SLAs (439–444): `ack_due, final_due = calculate_slas(payload.received_at)`, `complaint.ack_due_at = ack_due`, `complaint.final_due_at = final_due`. | **ComplaintDetail** edit modal: `openEditModal()` pre-fills `editForm.received_at` (line 727); datetime-local input (lines 2334–2338); `handleSaveEdit()` sends PATCH with `received_at: editForm.received_at ? dayjs(editForm.received_at).toISOString() : null` (line 754). |

**Other references (read-only or no value change):**

- **Reopen:** `service.reopen()` in `backend/app/services/complaints.py` (line 262) does `complaint.received_at = complaint.received_at` (keeps value unchanged).
- **Schema:** Create uses `ComplaintCreate.received_at` (required); update uses `ComplaintUpdate.received_at` (optional) in `backend/app/schemas/complaint.py` (lines 59, 84).

**Audit (old/new values):**

- **Not audited.** The `AuditLog` model exists (`backend/app/models/audit.py`: `entity`, `field`, `old_value`, `new_value`, `changed_by_id`, `created_at`) but **no code path in the application writes to it**. Grep for `AuditLog(` or `.add(.*[Aa]udit` in the backend returns no matches. So:
  - **Create:** only a generic `ComplaintEvent` is added: `add_event(db, complaint, "created", f"Complaint created with ref {reference}")` — no field-level log.
  - **Modify:** when `received_at` is changed, the API adds either `add_event(..., "updated", "Complaint updated", ...)` or (if category changed after final) a category-specific event; **no** `AuditLog` row with `old_value`/`new_value` for `received_at`.

**Due dates recalculated and recorded:**

- **Create:** Yes. `create_complaint()` calls `calculate_slas(complaint_data["received_at"])` and sets `complaint.ack_due_at` and `complaint.final_due_at` on the new row.
- **Modify (PATCH):** Yes, but only when `received_at` is actually changed. If `payload.received_at != original_received_at`, `ack_due_at` and `final_due_at` are recalculated and overwritten on the same complaint row. There is **no** separate table or history recording previous due dates; only the current values are stored.

**Summary:** Two code paths can set/change `received_at` (POST create, PATCH update). Both recalculate and store due dates when `received_at` is set/changed. No path records old/new `received_at` or previous due dates in an audit log.

---

## 2) Templates / components and D1 coverage (per FCA_DISP_REFERENCE.md)

### 2.1 Acknowledgement

| Item | Detail |
|------|--------|
| **Location** | **Frontend:** `frontend/src/pages/ComplaintDetail.tsx` — `openAcknowledgeModal()` (lines 379–412) builds the body; modal state `ackEmailBody`, `ackEmailSubject`, `ackSentAt`, `ackLogToComms`. |
| **Template content (exact)** | Lines 392–410: array of lines joined by `\n`: `Dear ${complainantName},` / blank / `Thank you for your complaint received on ${received}.` / blank / `We are sorry you have had cause to complain. We are reviewing your complaint and will keep you updated.` / blank / (if ackDue) `We aim to acknowledge complaints within required timescales (due by ${ackDue}).` / (if finalDue) `We aim to provide our final response by ${finalDue}.` / blank / `Reference: ${ref}` / blank / `Kind regards,` / handlerName. |
| **Stored where** | If "Log to Communications" is checked: a **Communication** is created with `kind='acknowledgement'`, `channel=email`, `direction=outbound`, `summary=buildAckCommunicationSummary(ackEmailTo, ackEmailSubject, ackEmailBody)` (to 1000 chars), `occurred_at=acknowledgedAtIso`, `is_final_response=false`. No attachment; body is in `summary` only. Acknowledgement timestamp is also stored on **Complaint**: `acknowledged_at` set by `POST /complaints/{id}/acknowledge`. |
| **D1 blocks (D1 applies to final response only)** | N/A — acknowledgement is not a final response. None of the D1 blocks (decision, redress, FOS, 6 months, website, leaflet, waiver) are in the ack template. |

---

### 2.2 Progress update

| Item | Detail |
|------|--------|
| **Exists?** | **No.** There is no dedicated "progress update" template or communication kind. |
| **What exists instead** | User can add a **Communication** with kind `general`, `phone_call`, or `letter` (and optionally outbound) to log that they updated the complainant. Kind dropdown in Add Communication modal (lines 2169–2174): `general`, `acknowledgement`, `final_response`, `phone_call`, `letter`. No pre-filled template for "progress update" and no `progress_update` kind. |

---

### 2.3 Delay response (8-week holding response, DISP 1.6.2R(2))

| Item | Detail |
|------|--------|
| **Exists?** | **No.** There is no "delay response" template, kind, or workflow. |
| **What exists instead** | None. If the firm has not sent a final response by 8 weeks, DISP requires a written response explaining delay + when final response is expected + FOS info. The app does not provide a template or a distinct communication type for this. |

---

### 2.4 Final response

| Item | Detail |
|------|--------|
| **Locations** | **Two ways to “issue” final response:** (1) **Button:** "Issue Final Response" → `POST /complaints/{id}/final-response` (`backend/app/api/complaints.py` line 687, `backend/app/services/complaints.py` `issue_final_response()`). No communication or attachment is created; only `complaint.final_response_at = utcnow()` and status. (2) **Add Communication with "Mark as Final Response":** `POST /complaints/{id}/communications` with `is_final_response=true` → creates **Communication** (summary + optional attachments), then calls `issue_final_response()` so `complaint.final_response_at` is set. |
| **Template content** | **There is no final response template in code.** Content is either: (a) free-form **Communication.summary** (user types in "Add Communication" textarea), or (b) entirely in **attachments** (e.g. uploaded PDF/Word of the final response letter). The UI shows a soft warning: "Final responses should normally have evidence attached" and allows "Continue anyway" without attachment. There are no placeholders or required sections for decision, redress, FOS, 6 months, website, leaflet, or waiver. |
| **D1 blocks in template?** | **None.** D1.1 (decision + reasons): not in any template — outcome is in Outcome model, not in a final response body template. D1.2 (redress): not in template. D1.3–D1.7 (right to refer to FOS, 6-month limit, FOS website, FOS leaflet, waiver): **not present** in any template or constant. D1.8 (guardrail): **no** — backend only requires that an outcome exists before issuing final response; no check that the communication or attachment contains D1 blocks. |
| **If final response is attachment-only** | The "letter" is the uploaded file. **Where stored:** `backend/app/api/complaints.py` (lines 836–855): each file is saved to `storage/attachments` with filename `{utcnow().timestamp()}-{upload.filename}` (e.g. `1736179200.123-final-response.pdf`). Path is resolved to absolute and stored in **Attachment**: `communication_id`, `file_name`, `content_type`, `storage_path`, `uploaded_at`. **Model:** `backend/app/models/attachment.py` — `Attachment.storage_path` is the full path; files are served via `app.mount("/attachments", StaticFiles(directory="storage/attachments"))` in `main.py`. **Tied to "sent":** The Communication row has `is_final_response=true` and `occurred_at` (user-supplied date/time). When this communication is created, `issue_final_response()` is called in the same request, which sets `complaint.final_response_at = utcnow()`. So "sent" is tied by: (1) **Complaint.final_response_at** (server timestamp when the action completed), (2) **Communication.occurred_at** (user-stated time of the communication), (3) **Communication** linked to **Attachment(s)** via `Attachment.communication_id`. Attachments are **not** versioned; the file is written once. There is an admin-only `DELETE /complaints/attachments/{attachment_id}` that can remove an attachment (and file), so storage is **not** immutable by policy—only by normal user flow (no edit/overwrite of existing final response comm). |

---

### 2.5 Summary table — D1 blocks per template

| Block | Acknowledgement | Progress update | Delay response | Final response |
|-------|-----------------|-----------------|----------------|----------------|
| D1.1 Decision outcome + reasons | N/A | — | — | No (data in Outcome only; no template) |
| D1.2 Redress/remedy | N/A | — | — | No (data in RedressPayment; no template) |
| D1.3 Right to refer to FOS | No | — | — | No |
| D1.4 FOS time limit (6 months) | No | — | — | No |
| D1.5 FOS website address | No | — | — | No |
| D1.6 FOS leaflet | No | — | — | No |
| D1.7 Waiver statement | No | — | — | No |
| **Template exists?** | Yes (body in frontend) | No | No | No (free-form summary + optional attachment only) |

---

### 2.6 Paths that set final_response_at or status final_response_issued

Every path that sets `final_response_at` or `Complaint.status = final_response_issued` goes through **one** service function: `service.issue_final_response(db, complaint, user_id)` in `backend/app/services/complaints.py` (lines 190–199). It sets `complaint.status = ComplaintStatus.final_response_issued`, `complaint.final_response_at = utcnow()`, and adds a **ComplaintEvent**: `add_event(db, complaint, "final_response_issued", "Final response issued", user_id)`.

| # | Path | Endpoint / trigger | (a) Creates Communication? | (b) Creates Attachment? | (c) Creates audit/event entry? | Can mark final response issued without evidence? |
|---|------|-------------------|----------------------------|--------------------------|--------------------------------|--------------------------------------------------|
| **1** | **Button "Issue Final Response"** | **API:** `POST /complaints/{complaint_id}/final-response` (no body). **Frontend:** `ComplaintDetail.tsx` line 919: `handleStatusChange('final-response', 'Final response issued')` → `api.post(\`/complaints/${id}/final-response\`)`. **Backend:** `complaints.py` lines 688–701: `issue_final_response()` only. | **No** | **No** | **Yes** — `issue_final_response()` adds ComplaintEvent `"final_response_issued"`, `"Final response issued"`. | **Yes.** No Communication and no Attachment are created. Only precondition: `complaint.outcome` must exist. User can mark final response issued with no stored letter, PDF, or communication record. |
| **2** | **Add Communication with "Mark as Final Response"** | **API:** `POST /complaints/{complaint_id}/communications` with form fields including `is_final_response=true`, `summary`, `occurred_at`, optional `files`. **Frontend:** Add Communication modal: kind "Final Response" or checkbox "Mark as Final Response" (lines 2164, 2245–2253); submit builds FormData with `is_final_response`, optional files. **Backend:** `complaints.py` lines 809–886: creates Communication via `add_communication_with_attachments()` (summary required by Form; attachments optional), then if `is_final_response` checks outcome and calls `issue_final_response()`. | **Yes** — one Communication with `is_final_response=true`, `summary`, `occurred_at`, etc. | **Only if client uploads files** — `attachment_files` default `[]`; Attachments created only for uploaded files. | **Yes** — (1) `add_communication_with_attachments()` adds ComplaintEvent `"communication_added"` (or `"note_added"` if internal); (2) `issue_final_response()` adds ComplaintEvent `"final_response_issued"`. | **Partially.** Always creates a Communication (evidence of *some* final response record). Can be issued with **no Attachment** (empty summary or minimal text + no file). So “evidence” = Communication row only; no requirement for attachment. Frontend soft warning allows "Continue anyway" without attachment. |
| **3** | **Seed / tests (non-user)** | **Seed:** `backend/app/seed/seed_data.py` line 74: `service.issue_final_response(db, recent, reviewer_id)` after outcome. **Tests:** `backend/app/tests/test_workflow.py`: `issue_final_response()` called directly. | **No** (seed/tests do not create a Communication in that call). | **No**. | **Yes** — same event from `issue_final_response()`. | N/A (internal only). |

**Summary — paths that can mark final response issued without evidence**

- **Path 1 (POST final-response):** Can mark final response issued **with no evidence at all** — no Communication, no Attachment. Only an outcome is required; no stored final response letter or communication.
- **Path 2 (POST communications with is_final_response=true):** Can mark final response issued **without attachment evidence** — Communication is always created (so there is a record), but Attachments are optional; summary can be minimal or empty.

---

## 3) UX assessment (non-disruptive)

### Journeys evaluated

- **Log complaint:** CreateComplaintWizard — category, source, description, complainant, policy. **Friction:** Category "Other" requires reason (good). No mandatory vulnerability checklist.
- **Triage:** Assign handler, escalate, status. **Friction:** Overdue/due dates visible on list and MyTasks; no in-detail banner "X days until final response due".
- **Investigate:** Status flow, outcome, redress, communications. **Friction:** Outcome rationale required (10+ chars) for key outcomes; good. Final response can be issued via "Add Communication" with "Mark as Final Response" or via "Issue final response" button; no D1 checklist before send.
- **Refer to broker:** **Missing.** Sales category does not trigger any referral flow or evidence capture.
- **Send update:** Add Communication (kind e.g. acknowledgement, general). **Friction:** No "progress update" template; no nudge to contact complainant if no outbound comm in X days.
- **Issue final response:** Outcome required; optional attachment warning. **Friction:** No requirement to confirm FOS/waiver/6-month/leaflet; no template with D1 blocks.
- **Redress approval:** RedressPayment with rationale/action_description; `approved` stored (currently record-only). **Friction:** No approval workflow or second sign-off in UI.
- **Close:** Close requires outcome + final response. **Friction:** No "cannot close without at least one outbound comm" rule.
- **MI:** Metrics, filters, reporting view. **Friction:** Adequate for internal MI.

### Suggested low-risk UX guardrails

1. **Final response send:** Before issuing final response (either path), require confirmation that D1 blocks are present (e.g. checklist: decision, redress, FOS statement, 6 months, website, leaflet, waiver), or that they are in the attached document. Add config flag so firms can enforce "block send until checklist complete" when ready.
2. **Timeline widget:** On complaint detail, show "Final response due in X days" (or "Overdue by X days") prominently; same for ack if not yet acknowledged.
3. **Required fields:** When marking a communication as "Final response", require either (a) at least one attachment, or (b) a "Final response summary" field that has minimum length and/or must include keywords (FOS, 6 months, etc.) — configurable.
4. **Delay response:** Add communication kind "Delay response (8-week)" and a template that includes: explanation of delay, when final response is expected, FOS leaflet/website, right to refer now. Do not allow "Issue final response" after 8 weeks without either a final response or a logged delay response.
5. **Broker referral:** When category is Sales (or "Sales/Arranging"), show a "Refer to broker" action; capture broker, date referred, what was sent; store as event + optional referral record.

---

## 4) Remediation backlog (safe implementation)

### High priority (compliance / audit risk)

| # | Title | Why | Minimal approach | Where to change | Tests | Rollout |
|---|--------|-----|------------------|-----------------|-------|---------|
| 1 | **D1 final response blocks (FOS + waiver + 6 months + leaflet)** | Final response can be sent without DISP-required wording. | Add configurable final-response template (or checklist) with placeholders for: decision/reasons, redress, right to refer to FOS, 6-month limit, FOS website, leaflet confirmation, waiver (Annex wording). Store template in DB or config; render in UI as "Final response checklist" and optionally prefill a body. Guardrail: optional feature flag "require_d1_checklist" before allowing "Issue final response" or marking comm as final. | New: `backend` template/constants for FOS text; `frontend` Final Response modal or checklist component; optional validation in `issue_final_response` / add_communication when `is_final_response=true`. | Unit: template render; integration: issue final response with checklist; e2e: cannot send final without checklist when flag on. | Feature flag; default off; enable per env. |
| 2 | **received_at write-once or audited correction** | Silent change of receipt date affects 8-week deadline and audit. | On PATCH, if `received_at` is changed: (1) write to AuditLog (entity=complaint, field=received_at, old_value, new_value, changed_by_id); (2) add ComplaintEvent type `received_at_corrected` with old/new values. Do not remove ability to correct; only add audit. | `backend/app/api/complaints.py` update_complaint: before applying payload.received_at, if different from original, insert AuditLog row and add_event(..., "received_at_corrected", f"Received date corrected from {old} to {new}", ...). | Integration: PATCH received_at, then assert AuditLog + event. | No flag; backward compatible. |

**Pseudocode (high priority):**

- **Item 1 (D1 checklist):**  
  - Backend: `FOS_FINAL_RESPONSE_BLOCKS = ["decision_outcome", "redress", "right_to_refer_fos", "fos_6_months", "fos_website", "fos_leaflet", "waiver_statement"]`. If `require_d1_checklist` and `is_final_response`: require body/checklist payload to include `d1_checklist_confirmed: list[str]` containing these keys (or single `d1_confirmed_in_attachment: true`).  
  - Frontend: Before "Issue final response" or "Add communication (final)", show modal with checklist; submit only when all checked or "confirmed in attachment" selected.

- **Item 2 (received_at audit):**  
  - In `update_complaint`, after `original_received_at = complaint.received_at` and before applying payload:  
    `if payload.received_at and payload.received_at != original_received_at: AuditLog(complaint_id=complaint.id, entity="complaint", field="received_at", old_value=iso(original_received_at), new_value=iso(payload.received_at), changed_by_id=current_user.id); add_event(db, complaint, "received_at_corrected", f"Received date corrected from {original_received_at} to {payload.received_at}", user_id).`
| 3 | **Delay response (DISP 1.6.2R(2))** | If we don’t send final response by 8 weeks, we must send a written delay response (reasons, when we will respond, FOS info). | Add communication kind `delay_response_8week`; add a "Send delay response" flow (template + optional attachment). Template must include: why not in a position to give final response, when we expect to, FOS leaflet/website, right to refer now, waiver wording. Optionally: when marking as delay response, do not set final_response_at; allow later final response. | New template (same place as D1); new kind in backend/frontend; optional endpoint or same add_communication with kind=delay_response_8week; timeline shows "Delay response sent". | Integration: add delay response comm, assert no final_response_at. | Config-driven template. |
| 4 | **Broker referral workflow (sales complaints)** | Sales complaints must be referred to broker with evidence. | Add optional table `broker_referral` (complaint_id, broker_identifier, referred_at, what_was_sent, broker_ack_at, notes) or extend Complaint with broker_referred_at, broker_referral_notes. Add "Refer to broker" action: record referral, add_event("referred_to_broker", ...). When category is Sales, show "Refer to broker" and optionally require referral before close (config). | Migration for broker_referral or new columns; `backend/app/services/complaints.py` refer_to_broker(); API POST `.../refer-to-broker`; frontend button when category = Sales. | Integration: refer to broker, assert event and record. | Feature flag or category-driven visibility. |

### Medium priority

| # | Title | Why | Minimal approach | Where to change | Tests | Rollout |
|---|--------|-----|------------------|----------------|-------|---------|
| 5 | **FOS content in acknowledgement template** | DISP expects ack to reassure; FOS need not be in ack but firm may want consistency. | Add optional FOS sentence/paragraph to ack template (config or constant): e.g. "If you remain dissatisfied after our response, you may refer to the Financial Ombudsman Service (see leaflet/website)." | `frontend/src/pages/ComplaintDetail.tsx` ack body template; or backend template if ack is server-generated. | Unit: template contains FOS when enabled. | Config; default off. |
| 6 | **Retention + legal hold** | DISP record-keeping; 6 years from closure. | Add `closed_at` (already present); add `legal_hold` boolean to Complaint (migration). Document retention in runbook; optional scheduled job to flag records past 6 years (no auto-delete without policy). | Migration legal_hold; admin UI or API to set legal_hold; docs. | Unit: legal_hold persists. | Default false. |
| 7 | **Populate AuditLog on complaint field changes** | Field-level audit for key changes. | In PATCH complaint, for each changed field (e.g. received_at, category, status if ever patched), insert AuditLog(complaint_id, entity="complaint", field=name, old_value, new_value, changed_by_id). | `backend/app/api/complaints.py` update_complaint: diff payload vs current, write AuditLog for changes. | Integration: PATCH, assert AuditLog rows. | Backward compatible. |

### Low priority / NO CHANGE NEEDED

| Item | Status |
|------|--------|
| 8-week deadline calculation | PASS — no change. |
| Status model and workflow | PASS — no change. |
| Outcome + redress data model | PASS — no change. |
| FOS referral (complainant refers to FOS) recording | PASS — fos_complaint, fos_reference, fos_referred_at, event; no change. |
| SLA breach flags and overdue filter | PASS — no change. |
| Reporting view and metrics | PASS — no change. |
| Vulnerability flag and notes | PASS — keep; optional later: support-needs checklist. |

---

## 5) Summary

- **Strong areas:** Intake, acknowledgement workflow, 8-week deadline calculation, status flow, outcome/redress, FOS referral recording, SLA visibility, reporting schema.
- **Gaps:** (1) No D1 final response template or guardrails (FOS, 6 months, leaflet, waiver); (2) received_at editable without dedicated audit; (3) No delay response (8-week) template or kind; (4) No broker referral workflow for sales complaints; (5) No retention/legal hold; (6) AuditLog not populated.
- **Remediation:** Prioritise D1 template/checklist and received_at audit (high risk); then delay response and broker referral; then retention/legal hold and AuditLog population. Use feature flags and config for new guardrails to avoid regression.

---

*Review completed against FCA_DISP_REFERENCE.md. For authoritative DISP wording see FCA Handbook links in that document.*
