# FCA DISP Reference — Complaints Handling Rules (Insurance Respondent)

This document is a **reference summary** of FCA Handbook DISP requirements relevant to our complaints handling system.
It is designed to help engineering/QA map **existing functionality → DISP requirement**, with **evidence**.
**No code changes are implied** by this document.

> Source of truth: FCA Handbook (DISP). Always confirm current rules at the official links below.

## Applicability (our context)
- We are an **insurer** and are the **respondent** for most complaints (claims handling, product/policy administration).
- **Sales/arranging** complaints are rare and are typically **referred back to the broker** who sold the policy (delegated authority distribution).
- Complainants: **eligible complainants** (insurance).
- Channels: complaints may arrive via **any reasonable means** (email, phone, letter, web, internal referral).
- Standard timeframe: **DISP 1.6 eight-week** final response regime applies.
- PSD/EMD “15 business day” rules are **out of scope for us** today (see Appendix A).

## How to use this document in AI code review (non-destructive contract)
When an AI assistant reviews or changes the codebase using this document:

1) **Evidence-first**: For each requirement (A–G), it must locate existing implementation and cite file paths/functions/components.
2) **Do not change what already meets requirements**: If evidence shows a requirement is met, mark PASS and do not propose modifications.
3) **Minimal safe fixes only**: If PARTIAL/FAIL, propose the smallest additive change possible (feature flag/config/new optional fields), avoiding refactors.
4) **Regression safety required**: Every proposed change must include tests to add (unit/integration/e2e) and a rollback/flag strategy.
5) **No PSD/EMD timelines**: Treat Appendix A as out of scope unless explicitly instructed otherwise.

---

## 1) Official FCA Handbook links
- DISP (main): https://handbook.fca.org.uk/handbook/DISP/
- DISP 1: https://handbook.fca.org.uk/handbook/DISP/1/
- DISP 1.6 (time limits / responses): https://handbook.fca.org.uk/handbook/DISP/1/6.html
- DISP 1.9 (records): https://handbook.fca.org.uk/handbook/DISP/1/9.html
- DISP 1.10 (reporting): https://handbook.fca.org.uk/handbook/DISP/1/10.html
- DISP 2.8 (FOS time limits): https://handbook.fca.org.uk/handbook/DISP/2/8.html
- DISP INTRO: https://handbook.fca.org.uk/handbook/DISP/INTRO/1.html

---

## 2) Core DISP requirements for the complaints system

### A. Intake & recognition (DISP 1.3 concept)
**Requirement**
- Have procedures to **identify, register, and respond** to complaints.
- Complaints must be accepted via **any reasonable means**.
- Vulnerability/support needs should be captured in a way that enables appropriate handling.

**System implications / evidence to look for**
- Ability to create a complaint from multiple channels (email/phone/letter/web/internal referrals).
- “Complaint” flag/category on inbound communications.
- Required capture: complainant identity, policy/claim refs, summary, channel, category, and timestamps.
- Vulnerability/support needs captured in **structured form** (not only free text) and influence handling/communications where applicable.

---

### B. Acknowledge + keep informed (DISP 1.6.1R)
**Requirement**
- Prompt written acknowledgement of receipt.
- Keep complainant informed of progress.

**System implications / evidence**
- Ack workflow/template and timestamp.
- Case updates log; optional customer notifications.
- Controls to prevent “silent handling” with no comms.

---

### C. 8-week deadline + required responses (DISP 1.6.2R)
**Requirement**
By end of eight weeks after receipt, send either:
1) **Final response**; or
2) **Written response** explaining delay and informing complainant they may refer to FOS now.

**System implications / evidence**
- Immutable `date_received` and computed `deadline_at`.
  - `date_received` should be **write-once**; if corrected, the correction must be **audited/versioned** (no silent overwrite).
- Escalation/alerts when approaching deadline.
- Status model supports: Open / Investigating / Pending / Final Response Sent / Closed (or equivalents).
- Outbound comms stored (body/PDF) + sent timestamp + sender.

---

### D. Final response content (DISP 1.6.2R(1) + DISP 2.8 concept)
**Requirement**
Final response includes:
- decision + reasons + (where appropriate) redress/remedy,
- FOS leaflet and/or required FOS information (per DISP),
- right to refer to FOS,
- reference to time limits and whether the firm consents to waive (per DISP annex wording).

**System implications / evidence**
- Final response template includes required FOS content and 6-month referral window logic (as applicable).
- Guardrails: cannot “send final response” without required sections.
- Versioned storage of the exact final response content sent.

#### D1. Final response — required blocks (template checklist)
For compliance checks, the final response template MUST be verifiable against these blocks:

- [ ] **Decision outcome**: upheld / partially upheld / not upheld (or equivalent) + reasons.
- [ ] **Redress/remedy** (if any): what we will do, amounts, and next steps.
- [ ] **Right to refer to FOS**: a clear statement that the complainant may refer to the Financial Ombudsman Service if dissatisfied.
- [ ] **FOS time limit**: states the complainant normally has **6 months** from the date of the final response to refer to FOS (or the applicable DISP time-limit wording used by the business).
- [ ] **FOS website address** included.
- [ ] **FOS leaflet**: confirm the leaflet is enclosed OR included as an attachment/link consistent with the firm’s delivery method.
- [ ] **Waiver statement**: indicates whether the firm consents to waive relevant FOS time limits, using the required Annex wording where applicable.

**Evidence to capture in code review**
- File path(s) of template(s)
- Exact section identifiers / placeholders / components where each block is present
- Any validation or “send guardrail” preventing sending without these blocks

---

### E. Sales complaints referred to broker (delegated authority practice)
**Requirement (operational control)**
- When complaint is sales/arranging, record the referral back to the broker and retain evidence.

**System implications / evidence**
- Category = sales/arranging triggers “refer to broker” workflow.
- Stores: broker identity, date/time referred, what was sent, and acknowledgement from broker (if captured).
- Audit log for the referral action.

---

### F. Record keeping (DISP 1.9 + DISP Sch 1 concept)
**Requirement**
- Maintain appropriate complaints records.

**System implications / evidence**
- Complaint register / database entries.
- Audit trail: changes, comms, attachments, decisions.
- Retention policy: 6 years from closure; legal hold.
- RBAC/permissions for sensitive/vulnerability-related data.

---

### G. Reporting readiness (DISP 1.10)
**Requirement**
- Capability to produce complaints MI / reporting outputs required under DISP rules (even if implemented later).

**System implications / evidence**
- Data model supports: category, product line, dates, outcomes, redress amounts, time-to-close, broker referrals, vulnerability flags.
- Export/dashboards can be added without reworking core schema.

---

## 3) Practical “system checklist” (for code review)
When reviewing the codebase, look for:
- **Fields**: `date_received` (immutable), `deadline_at`, `final_response_sent_at`, `closed_at`.
- **Templates**: acknowledgement, progress update, final response, delay response.
- **Timers/alerts**: jobs/schedulers that notify at thresholds.
- **Audit**: append-only event log for status/comms/assignment changes.
- **Evidence storage**: saved PDF/email body, attachment integrity/versioning.
- **Broker referral**: explicit workflow + evidence bundle.
- **Access control**: RBAC for complaint records, especially vulnerability/support needs.

---

## Appendix A — PSD/EMD shorter time limits (DISP 1.6.2AR etc.)
Out of scope for us today; retained for reference in case scope changes.
(Include the text you already have here.)