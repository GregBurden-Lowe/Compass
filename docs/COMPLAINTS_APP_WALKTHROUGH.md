# Compass Complaints App — Walkthrough

This guide is for new starters. It explains how to use the complaints app in plain English, with step-by-step instructions for the main tasks: opening a complaint, acknowledging it, adding communications, recording outcome and redress, issuing a final response, and closing. It also covers what managers can do and the rules and deadlines (SLAs) that apply.

---

## Signing in

- Open the app in your browser and sign in with the email and password given to you by your administrator.
- If your organisation uses two-factor authentication, you will be asked for a code after your password.
- If your session expires after a period of inactivity, sign in again when prompted.

---

## SLAs and rules (in plain English)

The app enforces two deadlines. These are set by your organisation but typically follow regulatory expectations.

**Acknowledgement deadline**

- Every new complaint must be **acknowledged** within a set number of **business days** (typically 2) after the complaint is received.
- "Acknowledged" means you have recorded that the complainant has been told their complaint has been received.
- The app calculates the due date when the complaint is created (weekends are not counted).
- If the due date passes and the complaint is not acknowledged, it is marked as **overdue** (breach).

**Final response deadline**

- Every complaint must receive a **final response** within a set number of **weeks** (typically 8) from the date the complaint was received.
- The app calculates this due date when the complaint is created.
- If the due date passes and no final response has been issued, the complaint is marked as **overdue** (breach).

**Other rules**

- You cannot close a complaint until a final response has been issued.
- You must record an **outcome** (e.g. upheld, partially upheld, not upheld) before you can issue a final response.
- If your organisation has the rule enabled, you must have logged at least one outbound communication (or an acknowledgement, or a delay response, or a final response) before you can close.
- Complaints can be **reopened** after they have been closed, if needed.
- If you cannot send a final response within the 8-week period, you can send a **delay response** (from week 7 onwards) to tell the complainant you need more time; the app offers this option when the complaint is old enough.

---

## What users can do

This section covers everyone who uses the app to handle complaints: complaints handlers, reviewers, and read-only users. The next section covers managers and admins.

### Dashboard

- The Dashboard shows high-level numbers: how many complaints are open, how many are overdue, how many are in investigation, and how many were closed recently.
- You can use the quick filters to see lists of open, overdue, in investigation, or closed complaints.
- Use the Dashboard to get a quick picture of workload and priorities.

### My Tasks

- My Tasks shows work that needs your attention.
- It lists complaints **assigned to you** that have something due: acknowledgements overdue or due this week, final responses overdue or due this week, and complaints with no activity for 21 days or more.
- It also shows **unassigned** complaints that need action (e.g. acknowledgement or final response due or overdue). You can pick these up and assign them to yourself or leave them for a manager to assign.
- Only items due **this week** appear in the "due" sections; overdue items are always shown.
- For each task you can see the complaint reference, status, and the relevant due date. Use "Acknowledge" for acknowledgement tasks, or "View" to open the complaint.
- Prioritise "Acknowledgements Overdue" and "Final Responses Overdue" first.

### Complaints list

- The Complaints list is the main list of all complaints. Use it to search and filter.
- You can filter by: reference number, complainant name, status, assigned handler, product, whether the complaint is marked as vulnerable, and whether it is overdue.
- Click a row to open the complaint and work on it.

### Step-by-step: How to open (create) a new complaint

1. In the main menu, click **New Complaint**.
2. You will see several sections. Complete them in order. Fields marked with an asterisk are required.
3. **Receipt information**
   - **Source**: How the complaint was received (e.g. Email, Phone, Letter, Web Form). Select from the list.
   - **Date received**: The date and time you received the complaint. You can click "Set to Now" to use the current date and time, or enter it manually. This date is used to calculate the acknowledgement and final response deadlines.
4. **Complainant details**
   - **Full name**: Required. Enter the complainant's full name.
   - **Email** and **Phone**: Optional but useful for contact.
   - **Date of birth** and **Address**: Optional; use if your process requires them.
   - **Vulnerable customer**: Tick this if the complainant is vulnerable. If you tick it, you can add vulnerability notes (for internal use). Access to these notes may be restricted depending on your organisation's settings.
5. **Complaint details**
   - **Description**: Required. Summarise what the complaint is about. This is used for search and for the timeline.
   - **Category**: Required. Choose the category that best fits (e.g. Claims, Sales, Service). If you choose "Other / Unclassified", you must fill in **Reason**.
   - **Reason**: Required only when category is "Other / Unclassified".
6. **Policy details** (optional but recommended)
   - **Policy number**, **Product**, **Insurer**, **Broker**, **Scheme**: Fill in what you have. Product, insurer, and broker can be selected from the reference lists if they are set up.
7. Click **Create complaint** (or **Submit**). The app will create the complaint and show you the complaint detail page with a new reference number (e.g. CMP-2026-000001). The acknowledgement and final response due dates are calculated automatically. The complaint is not assigned to anyone until someone assigns it (you can do that from the complaint page or from My Tasks).

### Step-by-step: How to find and open an existing complaint

- From the main menu, click **Complaints**. Use the search box or filters (reference, complainant, status, handler, product, overdue) to find the complaint. Click a row to open it.
- Or use **My Tasks** to see complaints that need action (assigned to you or unassigned). Click **View** on a task to open that complaint.
- Or use the **Dashboard** and click one of the quick filters (e.g. Open, Overdue) to see a list, then click a row to open the complaint.

### Step-by-step: How to assign a complaint to yourself or someone else

1. Open the complaint.
2. Find the **Assign** button or the assigned handler area (often near the top or in an actions section).
3. Click **Assign**. A modal or dropdown will appear.
4. **If you are a handler**: You can only assign an **unassigned** complaint to yourself. Choose your name and confirm.
5. **If you are a manager or admin**: You can assign the complaint to any user. Select the person from the list and confirm.
6. After assignment, the complaint will appear in that person's My Tasks (if there is something due) and they are responsible for progressing it.

### Step-by-step: How to acknowledge a complaint

You must acknowledge a complaint within the deadline (typically 2 business days of the date received). Acknowledging means you have told the complainant that you have received their complaint.

1. Open the complaint. It must be in status "New" or "Reopened" and not yet acknowledged.
2. Click the **Acknowledge** button (often near the top with other actions).
3. A modal will open. You may be asked whether to send an acknowledgement email. If your organisation uses the option to log the acknowledgement as a communication, you can add a short summary or use the default text.
4. Confirm the date and time of the acknowledgement (default is now).
5. Click **Confirm** or **Acknowledge**. The app will record the acknowledgement and update the status. The acknowledgement deadline is then met (or, if it was already overdue, the breach is cleared). If you chose to log it as a communication, a communication entry will appear in the Communications tab.

### Step-by-step: How to add a communication

Every contact with the complainant (or about the complaint) should be logged as a communication.

1. Open the complaint.
2. Click **Add communication** (or the equivalent button). A form will open.
3. **Audience**: Choose "Customer communication" for contact with the complainant, or "Note / Decision (internal)" for an internal diary entry that is not sent to the customer.
4. **Tag**: Choose a tag that describes the communication (e.g. General, Acknowledgement, Final response, Progress update, Delay response (8-week), Phone call, Letter). This helps others scan the Communications tab.
5. **Channel**: How the contact was made (Email, Phone, Letter, Web Form, etc.).
6. **Direction**: Inbound (from the customer) or Outbound (from you to the customer).
7. **Date and time**: When the contact happened.
8. **Summary**: Required. Write a short summary of what was said or sent. This is important for audit and search.
9. **Body**: Optional. You can add longer text (e.g. the text of an email) if needed.
10. **Attachments**: If you have files (e.g. a letter or email attachment), add them here. There is a limit on file size (typically 10 MB per file); your administrator can confirm.
11. **Final response**: If this communication is the final response to the complainant, tick "Final response" (or the equivalent). You can only issue a final response once you have recorded an outcome (see below).
12. Click **Save** (or **Add communication**). The communication will appear in the Communications list on the complaint. If you attached files, they will be available from the same place.

### Step-by-step: How to record an outcome

Before you can issue a final response, you must record the outcome of the complaint.

1. Open the complaint.
2. Find and click **Record outcome** (or "Add outcome" / "Update outcome" if one already exists).
3. **Outcome**: Select one of: Upheld, Partially upheld, Not upheld, Withdrawn, Out of scope.
4. **Rationale**: Explain why this outcome was chosen. This is for audit and compliance.
5. **Notes**: Optional. Any extra notes.
6. Click **Save outcome**. The outcome will appear on the complaint. You can update it later if needed before issuing the final response.

### Step-by-step: How to add redress (if applicable)

If you are offering redress (e.g. a payment or apology), record it so it is tracked.

1. Open the complaint.
2. Click **Add redress** (or "Add redress payment" / similar). The form may be under the Outcome section.
3. **Redress type**: Choose the type (e.g. Financial loss, Distress and inconvenience, Goodwill payment, Apology or explanation, Remedial action).
4. **Amount**: Enter the amount in pounds if it is a payment. Leave blank for non-monetary redress (e.g. apology only).
5. **Rationale**: Why this redress is being offered.
6. Save. If the redress is a payment that has been made, you may be able to record the payment date separately (e.g. "Record payment date") once authorised.

### Step-by-step: How to issue a final response

The final response is the formal reply to the complainant with your decision. You can only do this after you have recorded an outcome and (usually) added a communication that contains or accompanies the final response.

1. Open the complaint.
2. **Prerequisites**: Ensure an outcome is recorded. Add a communication that is the final response (tick "Final response" when adding it). You can attach the final response letter or email as an attachment to that communication.
3. Click **Issue Final Response** (or similar). The app may ask you to confirm. If you have not added a communication marked as final response, the app may warn you; you can still proceed in some configurations, but best practice is to have the final response communication and any attachments in place first.
4. Confirm. The app will set the final response date and update the status. The final response deadline is then met (or any breach cleared).

### Step-by-step: How to close a complaint

You can only close a complaint after a final response has been issued. Some organisations also require at least one outbound communication to be logged before closure.

1. Open the complaint.
2. Find the **Close complaint** section or buttons. There are two options:
   - **Close complaint**: Use this when the complaint has been fully resolved and you have issued a final response. This is the normal closure.
   - **Close as non-reportable**: Use this when the case does not meet the criteria for a reportable complaint (e.g. it is not a complaint as defined by your procedure). This does not require a final response.
3. Click **Close complaint** or **Close as non-reportable** as appropriate. A confirmation modal will open.
4. Enter or confirm the **closure date** (default is today).
5. Optionally add a **comment** if the form allows it.
6. Click **Confirm** (or **Close**). The complaint status will change to Closed. It will no longer appear in open or overdue lists, but you can still find it via the Complaints list (filter by status or search).

### Step-by-step: How to reopen a closed complaint (managers and admins)

If a closed complaint needs to be worked on again (e.g. the complainant has come back or new information has been received), a manager or admin can reopen it.

1. Open the closed complaint.
2. Find the **Reopen** button (often in the same area as Close, or in a "Closed" section).
3. Click **Reopen**. A modal will ask for a reason.
4. Enter a brief reason for reopening (e.g. "Complainant requested review" or "New evidence received").
5. Confirm. The complaint status will change to Reopened. You can then assign it, add communications, and if necessary issue a further final response and close again.

### Step-by-step: How to send a delay response (when you cannot meet the 8-week deadline)

If you cannot send a final response within 8 weeks, you must tell the complainant and may need to send a formal delay response. The app allows this from **week 7** onwards (so you are not prompted too early).

1. Open the complaint. Ensure it has been at least 7 weeks since the date received (the "Send delay response" option only appears then).
2. Click **Send delay response** (or add a communication and choose the "Delay response (8-week)" tag).
3. The app may pre-fill a standard summary. Edit it to include the date by which you will send the final response.
4. Save. This logs the delay response. You should still aim to send the final response as soon as possible; the delay response does not remove the need to meet the final response eventually.

### Other actions on the complaint page

- **Edit complaint**: Use **Edit** to change basic details (description, category, received date, complainant or policy details). Save your changes.
- **Assign**: See "How to assign a complaint" above.
- **Refer to broker**: If your organisation uses broker referral and the complaint category is Sales, you may see an option to refer to the broker.
- **Refer to ombudsman (FOS)**: If the complaint is being referred to the Financial Ombudsman Service, use this option and enter the FOS reference and date. The complaint may be reopened automatically if it was closed.
- **Escalate**: Managers can escalate the complaint to another manager; the complaint is reassigned to that person.

### Attachments

- You can attach files when adding a communication. Use the attachment section to upload and to open or download files later.
- Handle sensitive data according to your organisation's policy.

### Reference data

- If your role allows it, you can open "Reference Data" to view (and, for admins, edit) lists used in the app, such as products, brokers, and insurers. These are used when creating or editing complaints.

### Profile and settings

- Use Profile or Settings to view or change your profile and, if applicable, password or two-factor settings.

---

## What managers can do

Managers are users with the **Complaints Manager** or **Admin** role. In addition to everything in "What users can do", they can do the following.

### Reports

- Managers see a "Reports" item in the menu. Open it to run SLA reports.
- **Cases within SLA by user**: for a chosen period (e.g. last 30 or 90 days), this shows each handler and how many acknowledgements and final responses were completed on time (counts and percentages).
- **SLAs missed by user**: same period, but only handlers who had at least one missed acknowledgement or final response, with counts of missed acknowledgements and missed final responses.
- Use these reports to manage performance and identify training or support needs.

### My Tasks — unassigned work

- Managers see the same My Tasks as everyone else, but they also see **unassigned** complaints that need action (acknowledgements due or overdue, final responses due or overdue, and no activity for 21+ days). These appear with an "Unassigned" label so you can assign them to a handler or take them yourself.

### Assigning complaints

- Managers and admins can assign any complaint to any user. Handlers can only assign unassigned complaints to themselves.
- Use the complaint detail page to change the assigned handler.

### User management (Admin only)

- Only **Admin** users see "Users" in the menu. There they can add users, change roles, reset passwords, and manage two-factor authentication. Complaints Managers do not have access to user management.

### Escalation

- Complaints can be escalated to a complaints manager. When escalated, the complaint is reassigned to that manager.

### Reopen and close as non-reportable

- Reopening a closed complaint and closing a complaint as non-reportable are actions available to managers and admins (and, where allowed, to reviewers and handlers). Reopen is used when a case must be worked on again; close as non-reportable when the case does not meet the criteria for a reportable complaint.

---

## Roles in brief

- **Admin**: Full access. Can manage users and do all complaint actions, including reports and unassigned tasks.
- **Complaints Manager**: Can do all complaint actions and see Reports and unassigned tasks. Cannot manage users.
- **Complaints Handler**: Can create and edit complaints, add communications, progress status, and close where allowed. Can see unassigned tasks and assign them to themselves. Cannot manage users or see Reports.
- **Reviewer**: Can review, approve, and issue final responses; can edit complaints and add communications. Cannot manage users or see Reports. May have restricted access to some actions (e.g. assign only to self for unassigned).
- **Read only**: Can view complaints, communications, and attachments. Cannot create or change anything.

---

## Getting help

- For login or access problems, contact your administrator.
- For how to handle a specific complaint or process, follow your internal complaints procedure.
- For system outages or errors, contact your IT support with the app address and a short description of the issue.
