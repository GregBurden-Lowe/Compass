## Compass Frontend Page Review (Complaints Handler UX Audit)

**Date:** 2026-01-12  
**Audience:** Senior Complaints Handler (FCA-regulated complaints handling)  
**Scope:** React Router route-level pages + “screen-like” tabs/modals (flows) that materially affect the complaint handling workflow.  

### How to use this report
- **Start at the summary table** to find the weakest screens (lowest overall score).
- For each page/screen, use **Top issues** to understand risk and friction, then **Recommended improvements** as small, implementable tickets with clear success criteria.
- Prioritize fixes that reduce **operational risk** (wrong status, missing audit, wrong deadlines, wrong handler assignment) before “nice-to-have” UI polish.

---

## Routing system + pages enumerated
- **Routing:** React Router (`frontend/src/App.tsx`)
- **Authenticated routes:**
  - `/` → `Dashboard`
  - `/tasks` → `MyTasks`
  - `/complaints` → `ComplaintsList`
  - `/create` → `CreateComplaintWizard`
  - `/complaints/:id` → `ComplaintDetail` (tabbed: Overview / Communications / Outcome / History)
  - `/profile` → `Profile`
  - `/users` → `AdminUsers` (sidebar shows admin + complaints_manager)
  - `/reference` → `ReferenceData`
  - `/settings` → `Profile` (alias)
- **Unauthenticated screen:** Login + MFA enrollment modal rendered at `/` via `frontend/src/App.tsx`
- **Orphan screen (not routed):** `frontend/src/pages/MFASetup.tsx` (still Material UI)

---

## Summary table (scores 1–10)
Overall score = average of (Ease of use, Functionality, Layout), rounded to 1 decimal.

| Page / Screen | Route / Screen | Ease | Functionality | Layout | Overall |
|---|---:|---:|---:|---:|---:|
| Login + MFA enrollment | `/` (unauth) | 7 | 6 | 8 | 7.0 |
| Dashboard | `/` (auth) | 7 | 7 | 7 | 7.0 |
| My Tasks | `/tasks` | 8 | 7 | 8 | 7.7 |
| Complaints list | `/complaints` | 7 | 6 | 8 | 7.0 |
| Create complaint (wizard-style form) | `/create` | 8 | 7 | 8 | 7.7 |
| Complaint detail – Overview + Actions | `/complaints/:id#overview` | 6 | 6 | 7 | 6.3 |
| Complaint detail – Communications tab | `/complaints/:id#communications` | 7 | 7 | 7 | 7.0 |
| Complaint detail – Add Communication modal | modal | 6 | 6 | 7 | 6.3 |
| Complaint detail – Outcome & Redress tab | `/complaints/:id#outcome` | 6 | 6 | 7 | 6.3 |
| Complaint detail – Record/Update Outcome modal | modal | 6 | 6 | 7 | 6.3 |
| Complaint detail – Add Redress Payment modal | modal | 6 | 6 | 7 | 6.3 |
| Complaint detail – Close Complaint modal | modal | 7 | 7 | 7 | 7.0 |
| Complaint detail – Assign Complaint modal | modal | 7 | 7 | 7 | 7.0 |
| Complaint detail – History tab | `/complaints/:id#history` | 6 | 8 | 7 | 7.0 |
| Profile & Settings (incl MFA + password) | `/profile` + `/settings` | 7 | 7 | 7 | 7.0 |
| Admin Users (incl MFA reset/recovery, reset password) | `/users` | 7 | 7 | 7 | 7.0 |
| Reference data management | `/reference` | 7 | 5 | 7 | 6.3 |

---

## Page reviews

### Login + MFA Enrollment
- **Route/path**: `/` (when unauthenticated)
- **File(s)**: `frontend/src/App.tsx`
- **Purpose / overview**: Authenticate user, handle MFA challenge, handle MFA enrollment requirement + recovery codes.
- **Key user tasks**
  - Sign in (email/password)
  - Enter MFA code or recovery code
  - Enroll MFA (scan QR, verify code) and store recovery codes
- **Data captured / displayed**
  - Email, password
  - MFA code / recovery code
  - Enrollment QR + secret + recovery codes
- **Ratings**
  - **Ease of use: 7/10**: Clear, few fields, good loading states; recovery codes copy UX is decent.
  - **Functionality: 6/10**: Meets basics; limited operational “compliance cues” (no lockout messaging, no guidance on recovery code format).
  - **Layout: 8/10**: Clean, focused card layout.
- **Top issues (highest impact first)**
  1. Use of `alert()` for key actions (copy codes, success) interrupts flow and is not audit-friendly.
  2. MFA enrollment “skip” behavior is operationally risky without explicit “you may be blocked later” wording and a clear remaining-skip counter near primary action.
  3. Recovery codes are displayed but not strongly “must-store-now” enforced (beyond text).
  4. Error messages are generic (“Login failed…”) – not ideal for high-volume support.
  5. No explicit “session expired” UX.
- **Recommended improvements (tickets)**
  - **Replace `alert()` with in-app toast notifications**
    - **What**: Use a non-blocking toast component for success/error.
    - **Why**: Reduces interruption and improves speed for handlers.
    - **Where**: `frontend/src/App.tsx`
    - **Success**: No browser alerts; all feedback appears as dismissible in-app messages.
  - **Strengthen recovery code handling**
    - **What**: Add “I have saved my recovery codes” checkbox gating “Done”.
    - **Why**: Prevents account lockouts (operational continuity).
    - **Where**: MFA enrollment modal in `frontend/src/App.tsx`
    - **Success**: User cannot complete enrollment without acknowledging safe storage.
- **Quick wins (<1h)**
  - Add helper text clarifying recovery code format (case sensitivity, hyphens).
  - Add “Paste from clipboard” affordance on MFA/recovery inputs.
- **Risks / compliance concerns**
  - Recovery codes are security-critical; failure to store increases support burden and outage risk.
- **Questions / assumptions**
  - Assumption: backend enforces rate limiting / lockout; UI currently doesn’t surface it.

---

### Dashboard
- **Route/path**: `/` (when authenticated)
- **File(s)**: `frontend/src/pages/Dashboard.tsx`
- **Purpose / overview**: Operational overview (KPIs, SLA performance, risk indicators) + quick queue views.
- **Key user tasks**
  - Quick situational awareness: open volume, breaches, stale cases
  - Jump to “My Tasks”
  - Triage via queue tabs (mine/unassigned/breached/oldest)
- **Data captured / displayed**
  - KPIs: open, my open, breaches, stale
  - SLA 30d on-time % (ack/final)
  - Aging buckets, 7-day flow
  - Risk: vulnerable, reopened, escalated, final attachment %
  - Queue list (limited slice)
- **Ratings**
  - **Ease of use: 7/10**: KPIs are scannable; refresh helps.
  - **Functionality: 7/10**: Good coverage for regulated ops; missing drill-down into the lists behind KPIs.
  - **Layout: 7/10**: Dense but readable.
- **Top issues**
  1. KPIs are not **actionable** (can’t click “breaches” to open filtered list).
  2. Queue cards don’t show key compliance cues (vulnerability, due dates, handler, FOS).
  3. No “as of” timestamp shown in UI (even though API provides `as_of`).
  4. No direct “create complaint” from queue context (only button).
  5. No saved user preference for queue tab.
- **Recommended improvements**
  - **Make KPIs clickable deep-links**
    - **What**: Clicking “SLA breaches” opens `/complaints?overdue=true` (or equivalent).
    - **Why**: Converts awareness → action faster.
    - **Where**: `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/ComplaintsList.tsx`
    - **Success**: Users can go from KPI to filtered list in 1 click.
  - **Add compliance cues to queue rows**
    - **What**: Show “Ack due / Final due”, vulnerability badge, FOS badge.
    - **Why**: Reduces triage mistakes.
    - **Where**: `frontend/src/pages/Dashboard.tsx`
    - **Success**: Queue shows at least due date + vulnerability at a glance.
- **Quick wins**
  - Display “As of: …” timestamp on dashboard.
  - Add “View all” link for each queue tab.
- **Risks / compliance concerns**
  - Limited drill-down can delay action on SLA breaches.

---

### My Tasks
- **Route/path**: `/tasks`
- **File(s)**: `frontend/src/pages/MyTasks.tsx`
- **Purpose / overview**: Personal worklist grouped by urgency (ack/final) + quick acknowledge.
- **Key user tasks**
  - Identify overdue acknowledgements/final responses
  - Quickly acknowledge a new complaint
  - Navigate into the case to progress investigation/response
- **Data captured / displayed**
  - Task groups by status + due date comparisons
  - Relative due timing (e.g., “due in 2 days”, “a day ago overdue”)
  - Vulnerability flag badge
- **Ratings**
  - **Ease of use: 8/10**: Clear grouping + KPI summary; quick action is valuable.
  - **Functionality: 7/10**: Helps manage SLA; limitations around pagination and incomplete “update” workflow.
  - **Layout: 8/10**: Very scannable.
- **Top issues**
  1. Hard limit of **100 cases** fetched; tasks may be incomplete for high-volume handlers.
  2. Focus is on Ack/Final only; no “progress update due” workflow (often required operationally).
  3. Quick acknowledge has **no confirmation** and no preview of what it implies (status change).
  4. Doesn’t surface FOS/escalation/non-reportable flags.
  5. “Overdue wording” is slightly awkward (“a day ago overdue”).
- **Recommended improvements**
  - **Ensure tasks list is complete**
    - **What**: Add pagination or dedicated backend endpoint `/complaints/my-tasks` with server-side grouping.
    - **Why**: Missing tasks is an SLA breach risk.
    - **Where**: `frontend/src/pages/MyTasks.tsx` (and backend if needed)
    - **Success**: Page shows all relevant tasks; no silent truncation at 100.
  - **Add “Final due” and “Ack due” absolute date on hover/secondary line**
    - **What**: Show both relative + absolute dates.
    - **Why**: Reduces date interpretation errors.
    - **Where**: `frontend/src/pages/MyTasks.tsx`
    - **Success**: Both representations visible.
- **Quick wins**
  - Add FOS badge + escalated badge if present.
  - Adjust overdue text (“Overdue by X”) rather than appended phrasing.
- **Risks / compliance concerns**
  - Incomplete task data directly increases SLA breach likelihood.

---

### Complaints List
- **Route/path**: `/complaints`
- **File(s)**: `frontend/src/pages/ComplaintsList.tsx`
- **Purpose / overview**: Main list for searching, filtering, sorting, and navigating to cases.
- **Key user tasks**
  - Find a case quickly (by reference/complainant/description)
  - Filter by status/handler/overdue/vulnerable
  - Triage by sorting and flags
- **Data captured / displayed**
  - Reference, status, complainant name, description, received date, handler name
  - Flags: overdue, vulnerable, FOS
- **Ratings**
  - **Ease of use: 7/10**: Good filter panel + sorting UI.
  - **Functionality: 6/10**: Two high-risk filter bugs (status + unassigned handler).
  - **Layout: 8/10**: Table is readable and scannable.
- **Top issues**
  1. **Status filter mismatch**: UI offers “Investigating” but the app’s status enum uses “In Investigation” (filter will not match).
  2. **Handler filter “Unassigned” likely broken**: value `"unassigned"` is sent as `handler_id=unassigned` (backend typically expects UUID). This can return wrong results or 422.
  3. Pagination is a “best guess” (no total count). Users can hit “Next” into empty pages.
  4. Search is client-side only on the current page; won’t scale to thousands of cases.
  5. No “saved views” (e.g., “My breaches”, “Team breaches”) for high-volume handling.
- **Recommended improvements**
  - **Fix status filter to match canonical enum**
    - **What**: Use the exact values from `ComplaintStatus` (`frontend/src/types.ts`) for options.
    - **Why**: Prevents silent mis-filtering → missed SLA risk.
    - **Where**: `frontend/src/pages/ComplaintsList.tsx`
    - **Success**: Selecting the status shows the correct results.
  - **Implement Unassigned filter correctly**
    - **What**: Send `unassigned=true` (or `handler_id` omitted + `assigned=false`) depending on backend; do NOT send `"unassigned"` as id.
    - **Why**: Prevents incorrect triage and missed handoffs.
    - **Where**: `frontend/src/pages/ComplaintsList.tsx`
    - **Success**: “Unassigned” reliably returns complaints with `assigned_handler_id == null`.
  - **Add server-side total count**
    - **What**: Update backend list endpoint to return `{items, total}` or `X-Total-Count` header.
    - **Why**: Reliable pagination for operational use.
    - **Where**: `frontend/src/pages/ComplaintsList.tsx` + backend `/complaints`
    - **Success**: Pagination shows accurate total pages and disables “Next” correctly.
- **Quick wins**
  - Add “Copy reference” action in table row.
  - Persist filters in URL querystring for shareable links.
- **Risks / compliance concerns**
  - Mis-filtering is a major operational risk: handlers will miss breached cases or mis-triage.

---

### Create Complaint (Wizard-style form)
- **Route/path**: `/create`
- **File(s)**: `frontend/src/pages/CreateComplaintWizard.tsx`
- **Purpose / overview**: Capture intake details for a new complaint with validation and reference-data backed comboboxes.
- **Key user tasks**
  - Capture receipt info (source, received date/time)
  - Capture complainant details (name, contact, DOB, vulnerability)
  - Capture complaint details (description, category, reason)
  - Capture policy context (policy no, insurer/broker/product)
- **Data captured / displayed**
  - Source, received_at
  - Complainant fields + vulnerability flag/notes
  - Complaint description/category/reason
  - Policy info + reference data selections
- **Ratings**
  - **Ease of use: 8/10**: Clear sectioning; good inline validation; unsaved changes warning helps.
  - **Functionality: 7/10**: Solid intake; missing some compliance/triage fields and attachment capture.
  - **Layout: 8/10**: Strong hierarchy and spacing.
- **Top issues**
  1. No way to add **initial evidence/attachments** at intake (common operational need).
  2. No duplicate detection (“possible duplicate case” prompts based on email/policy/reference).
  3. No explicit “ack/final SLA dates” preview (useful for sanity check).
  4. Limited validation (phone format, DOB sanity, required reason for certain categories).
  5. Success message is passed via navigation state but not necessarily surfaced on destination page.
- **Recommended improvements**
  - **Add “Attachments / evidence” to intake**
    - **What**: Add file upload block (multiple files) on intake.
    - **Why**: Reduces rework and improves record completeness.
    - **Where**: `frontend/src/pages/CreateComplaintWizard.tsx` (+ backend create complaint attachments if needed)
    - **Success**: User can upload evidence at creation; attachments visible on case.
  - **Add lightweight duplicate warning**
    - **What**: On blur of email/policy number, query backend for matches and show “possible duplicate” list.
    - **Why**: Prevents split records and audit risk.
    - **Where**: `frontend/src/pages/CreateComplaintWizard.tsx`
    - **Success**: Users are warned with suggested existing cases before creating another.
- **Quick wins**
  - Add helper text for “Received date” (timezone) and default to local.
  - Add character counter for “Reason” if you expect longer rationales.
- **Risks / compliance concerns**
  - Missing initial evidence capture can lead to incomplete audit trail at intake.

---

### Complaint Detail – Overview + Actions
- **Route/path**: `/complaints/:id` (Overview tab)
- **File(s)**: `frontend/src/pages/ComplaintDetail.tsx`
- **Purpose / overview**: Primary case workspace: status actions, core case info, timeline, assignment.
- **Key user tasks**
  - Progress status (acknowledge → investigate → final response → close)
  - Assign to self / assign to others (role-limited)
  - View case essentials (description, complainant, key dates)
  - Refer to ombudsman (FOS)
- **Data captured / displayed**
  - Status, received/ack/closed timestamps
  - Complaint description/category/reason/product/scheme
  - Complainant name/email/phone (DOB/address not shown here)
  - Assignment current handler + assign actions
  - FOS flag + (optional) reference displayed
- **Ratings**
  - **Ease of use: 6/10**: Core actions are visible, but guardrails are thin; some actions behave unexpectedly.
  - **Functionality: 6/10**: Missing edit workflow for intake fields; several compliance risks around status changes and FOS referral.
  - **Layout: 7/10**: Reasonable split between main and sidebar.
- **Top issues**
  1. **Status change actions use `alert()` and lack confirmations / rationale capture**, increasing mistake risk.
  2. **“Close as Non-Reportable” is triggered directly** (no closure date modal, no required rationale in UI).
  3. **FOS referral uses `prompt()`** (no date picker, no validation, no cancel-safe modal, no role gating shown here beyond read_only).
  4. “Draft Response” button navigates to same page (no distinct workflow).
  5. Missing “edit complaint” capability for intake fields (contradicts common ops needs for correcting capture).
- **Recommended improvements**
  - **Replace FOS prompt with proper modal**
    - **What**: Modal capturing FOS reference + referred date, with validation and cancel.
    - **Why**: Ombudsman referral is a high-stakes event; UX must prevent mistakes.
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx`
    - **Success**: Referral cannot be submitted without reference; date defaults to today; no browser prompt used.
  - **Add guardrails for status transitions**
    - **What**: Confirm dialogs for irreversible actions (final response, close, close non-reportable) and require notes/rationale where appropriate.
    - **Why**: Reduces accidental compliance breaches.
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx` + backend schemas if needed
    - **Success**: User must confirm and (when required) enter rationale; history records it.
  - **Implement (or restore) complaint editing**
    - **What**: Add “Edit” mode to update capture fields (received_at/source/complainant/policy/etc.) with audit event.
    - **Why**: Correcting intake data is common and must be auditable.
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx`
    - **Success**: Editable fields update via API; history records changes with user+timestamp.
- **Quick wins**
  - Show complainant DOB/address in Overview (read-only) for verification calls.
  - Display SLA due dates (ack_due_at, final_due_at) on the Timeline card.
- **Risks / compliance concerns**
  - Lack of confirmations + missing rationale capture can cause incorrect status/outcome recording (audit risk).

---

### Complaint Detail – Communications Tab
- **Route/path**: `/complaints/:id` (Communications tab)
- **File(s)**: `frontend/src/pages/ComplaintDetail.tsx`
- **Purpose / overview**: Log and review customer communications, including attachments and “final response” marking.
- **Key user tasks**
  - Add communication entry (channel/direction/summary/date)
  - Upload evidence/attachments
  - Mark an interaction as “Final Response”
- **Data captured / displayed**
  - Communications list sorted by occurred_at desc
  - Attachments with outbound links
- **Ratings**
  - **Ease of use: 7/10**: Add flow is clear; list layout is readable.
  - **Functionality: 7/10**: Supports core record-keeping; some enum/display mismatches.
  - **Layout: 7/10**: Good card pattern.
- **Top issues**
  1. Direction styling compares to `'Inbound'` but values appear lowercase (`inbound/outbound`) → badge color can be wrong.
  2. No required fields beyond summary (e.g., occurred_at sanity, mandatory channel).
  3. Attachments lack metadata (size/type) and download behavior is “open in new tab”.
  4. No inline search/filter within communications.
  5. No template or structured fields for common contact outcomes (e.g., “attempted call – no answer”).
- **Recommended improvements**
  - **Fix direction normalization**
    - **What**: Normalize direction display + color mapping to backend enum values.
    - **Why**: Avoid misreading inbound vs outbound (audit + operational clarity).
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx`
    - **Success**: Inbound always shows correct color; outbound always shows correct color.
  - **Improve attachment UX**
    - **What**: Show file size/type and use a download link (or explicit “Open” vs “Download”).
    - **Why**: Reduces mistakes when handling sensitive documents.
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx`
    - **Success**: Attachment chips show metadata; user intent is clear.
- **Quick wins**
  - Add a simple search box above communications list.
- **Risks / compliance concerns**
  - Mislabeling direction can distort audit trail interpretation.

---

### Complaint Detail – Add Communication Modal (flow)
- **Route/path**: Modal
- **File(s)**: `frontend/src/pages/ComplaintDetail.tsx`
- **Purpose / overview**: Structured capture for a communication event + optional files.
- **Key user tasks**
  - Choose channel/direction, write summary, select occurred date/time, upload files
- **Data captured / displayed**
  - `channel`, `direction`, `summary`, `occurred_at`, `is_final_response`, attachments
- **Ratings**
  - **Ease of use: 6/10**: Works but can be safer; file selection feedback is limited.
  - **Functionality: 6/10**: Needs stronger validation and safer confirmation around “final response”.
  - **Layout: 7/10**: Standard modal layout.
- **Top issues**
  1. Marking “Final Response” has no confirmation and no requirement to upload final letter.
  2. No character count / minimum detail guidance for summary.
  3. No display of selected files before submit.
  4. Error handling uses string formatting; better to show per-field errors.
  5. No “save and add another” for high-volume logging.
- **Recommended improvements**
  - **Guardrail: require evidence when marking final response**
    - **What**: If `is_final_response = true`, require at least one attachment or a “final response notes” field.
    - **Why**: Ensures auditability of final response issuance.
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx` (modal)
    - **Success**: Cannot submit “final response” comm without satisfying rule; history reflects it.
- **Quick wins**
  - Show list of selected files and allow removal before submit.

---

### Complaint Detail – Outcome & Redress Tab
- **Route/path**: `/complaints/:id` (Outcome tab)
- **File(s)**: `frontend/src/pages/ComplaintDetail.tsx`
- **Purpose / overview**: Record outcome decision and redress actions/payments; close case.
- **Key user tasks**
  - Record or update outcome and rationale
  - Add redress items (monetary/non-monetary) and track approval/status
  - Close complaint with closure date
- **Data captured / displayed**
  - Outcome type + notes
  - Redress payments: type, amount, status, approval, rationale, action details, notes
  - Closure date/time via modal (for “close”)
- **Ratings**
  - **Ease of use: 6/10**: Many fields; insufficient guardrails.
  - **Functionality: 6/10**: Captures basic decision/redress but lacks required rationale and stage gating.
  - **Layout: 7/10**: Cards are readable; could be more structured.
- **Top issues**
  1. Outcome notes are optional even when they should be mandatory for audit defensibility.
  2. Redress “amount” allows blank (good) but no validation for negative/precision or required rationale for certain types.
  3. No approval workflow cues (who approved, when) shown in UI.
  4. “Close as non-reportable” is not routed through the closure-date modal.
  5. No structured “decision rationale” fields beyond free text.
- **Recommended improvements**
  - **Make decision rationale mandatory based on outcome**
    - **What**: Require outcome notes for upheld/partial/out-of-scope; enforce minimum length.
    - **Why**: Supports FCA audit expectations and consistent decisions.
    - **Where**: Outcome modal in `frontend/src/pages/ComplaintDetail.tsx`
    - **Success**: Users cannot save outcome without rationale when required; history records update.
  - **Unify closing flows**
    - **What**: Route both “close” and “close non-reportable” through the closure modal; capture closure date/time + reason.
    - **Why**: Prevents missing closure timestamps and rationale.
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx`
    - **Success**: Both closing actions require closure date; audit trail includes action + reason.
- **Quick wins**
  - Add inline validation for redress amount (>= 0, 2dp).
  - Add “Total redress” summary card.
- **Risks / compliance concerns**
  - Optional rationale and inconsistent closure capture are significant audit risks.

---

### Complaint Detail – History Tab
- **Route/path**: `/complaints/:id` (History tab)
- **File(s)**: `frontend/src/pages/ComplaintDetail.tsx`
- **Purpose / overview**: Show audit events with user attribution and timestamps.
- **Key user tasks**
  - Confirm what happened, when, and by whom
  - Support handoffs and internal QA/review
- **Data captured / displayed**
  - Events from `/complaints/:id/events`, includes `created_by_name`
  - Icon mapping (includes `referred_to_fos`, `accessed`, etc.)
- **Ratings**
  - **Ease of use: 6/10**: Useful but could overwhelm without filters.
  - **Functionality: 8/10**: Strong foundation for audit trail.
  - **Layout: 7/10**: Clean list; needs density controls.
- **Top issues**
  1. No filtering (e.g., hide “accessed” events) and no grouping by day.
  2. No “copy to clipboard” or “export” for audit sharing.
  3. No correlation linking events to artifacts (e.g., final response document).
  4. Event naming consistency depends on backend; UI doesn’t normalize.
  5. No “pin important events” (final response issued, closure).
- **Recommended improvements**
  - **Add event filters + hide noise**
    - **What**: Add toggles: show/hide accessed, show only status changes, show only communications/outcomes.
    - **Why**: Enables fast audit review during complaints handling.
    - **Where**: `frontend/src/pages/ComplaintDetail.tsx` (History tab)
    - **Success**: Users can reduce noise and find key events quickly.
- **Quick wins**
  - Add “Copy event” on hover (text only).
- **Risks / compliance concerns**
  - If the history is noisy, reviewers may miss key compliance events.

---

### Profile & Settings
- **Route/path**: `/profile`, `/settings` (alias)
- **File(s)**: `frontend/src/pages/Profile.tsx`
- **Purpose / overview**: User security controls (password + MFA), plus user identity info.
- **Key user tasks**
  - Change password
  - Enable/disable MFA, regenerate recovery codes
  - Copy recovery codes
- **Data captured / displayed**
  - User profile fields (name, email, role, created_at, optional last_login)
  - Password change fields + strength meter
  - MFA enrollment QR + secret + recovery codes
- **Ratings**
  - **Ease of use: 7/10**: Good guidance and visibility toggles.
  - **Functionality: 7/10**: Covers needed security operations.
  - **Layout: 7/10**: Clear card structure.
- **Top issues**
  1. Disabling MFA is allowed with a confirmation, but no policy-driven guardrail (e.g., admin-required).
  2. Recovery codes regeneration has confirm but no forced “store now” acknowledgement.
  3. Password strength is heuristic; not aligned to explicit policy (if any).
  4. Some fields (created_at/last_login) rely on API; if missing, user sees nothing.
  5. No audit view of security events (only server logs).
- **Recommended improvements**
  - **Add policy messaging for MFA**
    - **What**: Display “Your organisation requires MFA” if enforced; otherwise warn more strongly.
    - **Why**: Security continuity in regulated environments.
    - **Where**: `frontend/src/pages/Profile.tsx`
    - **Success**: Users clearly understand enforcement rules.
- **Quick wins**
  - Replace confirm dialogs with consistent modal confirmations.

---

### Admin Users
- **Route/path**: `/users`
- **File(s)**: `frontend/src/pages/AdminUsers.tsx`
- **Purpose / overview**: Admin/manager user management: create/edit users, reset password, reset MFA, regenerate recovery codes.
- **Key user tasks**
  - Create a user (role, initial password)
  - Edit user role/status
  - Reset user password (provide temp password)
  - Reset MFA / regenerate recovery codes
- **Data captured / displayed**
  - User list (`/users`)
  - Create/edit form fields
  - Temp password display
  - Recovery codes modal
- **Ratings**
  - **Ease of use: 7/10**: Modals are clear; actions are visible.
  - **Functionality: 7/10**: Meets admin ops; could improve auditability and safety.
  - **Layout: 7/10**: Table + modals are standard.
- **Top issues**
  1. No explicit “who performed action” audit UI (admin actions are sensitive).
  2. Temp password + recovery codes shown inline; no “copy” buttons or safety guidance beyond text.
  3. No search/filter for large user lists.
  4. Role gating is mostly in navigation; page doesn’t visibly block access for non-privileged users (relies on backend).
  5. No “deactivation reason”.
- **Recommended improvements**
  - **Add audit trail visibility for admin actions**
    - **What**: Display last password reset time, last MFA reset time, last role change time + actor.
    - **Why**: Compliance and accountability.
    - **Where**: `frontend/src/pages/AdminUsers.tsx` (+ backend fields/events)
    - **Success**: Admin can see when and by whom sensitive actions occurred.
- **Quick wins**
  - Add “Copy temp password” and “Copy recovery codes” buttons.

---

### Reference Data Management
- **Route/path**: `/reference`
- **File(s)**: `frontend/src/pages/ReferenceData.tsx`
- **Purpose / overview**: Maintain products/brokers/insurers used by intake comboboxes; supports reporting consistency.
- **Key user tasks**
  - Search reference items
  - Add new item (admin)
  - Import CSV (admin)
- **Data captured / displayed**
  - Item name and ID (partial)
  - Import results (“Successfully imported X items”)
- **Ratings**
  - **Ease of use: 7/10**: Simple and focused.
  - **Functionality: 5/10**: Basic add/import; weak governance (duplicates, naming conventions, no edit/deprecate).
  - **Layout: 7/10**: Clean card grid.
- **Top issues**
  1. No edit/rename/deprecate workflow → bad data persists and propagates to complaints.
  2. Duplicate prevention is only described (“skipped”)—no UX showing which duplicates were skipped.
  3. No governance cues (naming conventions, canonical forms).
  4. No role gating in UI besides hiding buttons; non-admin can still view but might need read-only cues.
  5. Item ID is shown but not useful operationally; missing created date/owner.
- **Recommended improvements**
  - **Add deprecation (soft delete) + rename**
    - **What**: Allow admin to rename items and mark as inactive/deprecated (keeps historical complaints intact).
    - **Why**: Improves reporting accuracy and reduces triage confusion.
    - **Where**: `frontend/src/pages/ReferenceData.tsx` (+ backend)
    - **Success**: Deprecated items don’t appear in new-intake comboboxes; old complaints still show the historical value.
  - **Improve CSV import feedback**
    - **What**: Show counts for added/skipped/invalid and download a CSV of failures.
    - **Why**: Improves data governance and reduces repeated import errors.
    - **Where**: `frontend/src/pages/ReferenceData.tsx`
    - **Success**: Admin can see exactly what happened and correct the input file.
- **Quick wins**
  - Add “copy name” and “copy id” actions for each item (for debugging/reporting).
- **Risks / compliance concerns**
  - Poor reference governance increases reporting inaccuracy and operational confusion.

---

## Cross-cutting findings (high leverage)

### 1) Replace browser primitives (`alert`, `prompt`, `confirm`) with consistent in-app patterns
- **Why**: Browser dialogs interrupt high-volume work and are inconsistent with audit-focused workflows.
- **Where**: `ComplaintDetail.tsx` (alerts, prompt), `App.tsx`, `MyTasks.tsx`, `Profile.tsx`, `AdminUsers.tsx`
- **Success**: All confirmations use modals; all feedback uses toasts/inline banners.

### 2) Canonical status/enum consistency
- **Why**: Silent mismatches cause missed SLA cases and incorrect triage.
- **Where**: `ComplaintsList.tsx` status filter; `ComplaintDetail.tsx` comm direction badge; any other status text.
- **Success**: UI options are sourced from shared enum/constants; filters match real values.

### 3) Guardrails for regulated actions (final response, closure, non-reportable, FOS)
- **Why**: These actions often require rationale, timestamps, and artifacts.
- **Where**: `ComplaintDetail.tsx`
- **Success**: Mandatory rationale where required, consistent closure date capture, and evidence checks.

---

## Appendix: Orphan / legacy screen

### `MFASetup.tsx` (Material UI)
- **File**: `frontend/src/pages/MFASetup.tsx`
- **Observation**: Uses MUI (not Tailwind) and is not referenced in routing. Consider removing or migrating to avoid confusion and inconsistent UI.

---

## Stop condition notes
- **Report saved at**: `/docs/page-review.md`
- **Pages/screens reviewed (count)**: 17 (8 routes + login screen + 8 screen-like tabs/modals)
- **Lowest-scoring areas (brief)**
  - **Complaint detail (Outcome/Redress + modals)**: weakest due to missing required rationale/guardrails and inconsistent closure/non-reportable/FOS flows.
  - **Reference data management**: weakest due to governance gaps (rename/deprecate, import feedback) which impacts reporting consistency.
  - **Complaints list**: functionally risky due to enum mismatches (“Investigating”) and likely broken “Unassigned” filtering.


