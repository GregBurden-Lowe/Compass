# User Acceptance Testing (UAT) Document
## Compass Complaints Management System

**Version:** 1.0  
**Date:** January 2026  
**Prepared for:** User Acceptance Testing and Sign-off

---

## Document Purpose

This document provides a comprehensive test plan for the Compass Complaints Management System. Each test case should be executed and signed off by designated users before the system is approved for production use.

**How to Use This Document:**
1. Work through each test case in order
2. Record the actual result for each test
3. Mark as Pass ✅ or Fail ❌
4. Note any issues or observations
5. Sign off at the end of each section
6. Complete final sign-off at the end

---

## Test Environment

- **URL:** https://compass.lpgapps.work
- **Browser:** ________________
- **Tester Name:** ________________
- **Date:** ________________
- **Role:** ________________

---

## 1. Authentication & Access Control

### Test Case 1.1: User Login
**Objective:** Verify users can log in with valid credentials

**Steps:**
1. Navigate to the application URL
2. Enter a valid email address
3. Enter the correct password
4. Click "Login" or press Enter

**Expected Result:**
- User is successfully logged in
- Dashboard is displayed
- User's name appears in the top navigation bar

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 1.2: Invalid Login Credentials
**Objective:** Verify system rejects invalid login attempts

**Steps:**
1. Navigate to the application URL
2. Enter an invalid email or password
3. Click "Login"

**Expected Result:**
- Error message displayed: "Incorrect credentials"
- User remains on login page
- No access granted

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 1.3: Case-Insensitive Email Login
**Objective:** Verify email login is case-insensitive

**Steps:**
1. Log in with email in different cases (e.g., `Test@Example.com` vs `test@example.com`)
2. Use the same password

**Expected Result:**
- Login succeeds regardless of email case
- User is logged in successfully

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 1.4: Password Visibility Toggle
**Objective:** Verify password can be shown/hidden

**Steps:**
1. On login page, enter a password
2. Click the eye icon to toggle password visibility

**Expected Result:**
- Password is hidden by default (dots/asterisks)
- Clicking eye icon shows password in plain text
- Clicking again hides it

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 1.5: Enter Key Login
**Objective:** Verify login works with Enter key

**Steps:**
1. Enter email and password
2. Press Enter key instead of clicking Login button

**Expected Result:**
- Login form submits successfully
- User is logged in

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 1.6: Session Expiry / Invalid Token
**Objective:** Verify users are logged out when token expires

**Steps:**
1. Log in successfully
2. Wait for token to expire OR manually clear token from browser storage
3. Try to navigate to a protected page

**Expected Result:**
- User is automatically redirected to login page
- No 401 errors in console
- Clear message or redirect

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 1.7: Multi-Factor Authentication (MFA) Setup
**Objective:** Verify MFA enrollment process

**Steps:**
1. Log in as a user without MFA enabled
2. Follow MFA setup prompts
3. Scan QR code with authenticator app
4. Enter verification code

**Expected Result:**
- QR code is displayed
- Authenticator app can scan code
- Verification code is accepted
- MFA is enabled for user

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 1.8: MFA Login
**Objective:** Verify MFA-protected login

**Steps:**
1. Log in with email and password for MFA-enabled user
2. Enter MFA code from authenticator app
3. Complete login

**Expected Result:**
- MFA code field appears after password
- Valid code allows login
- Invalid code shows error

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 1 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 2. Password Management

### Test Case 2.1: Change Password (Self-Service)
**Objective:** Verify users can change their own password

**Steps:**
1. Log in as any user
2. Navigate to Profile page
3. Enter current password
4. Enter new password (min 8 characters)
5. Confirm new password
6. Click "Change Password"

**Expected Result:**
- Password is successfully changed
- Success message displayed
- User can log in with new password

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 2.2: Forced Password Change After Reset
**Objective:** Verify users must change password after admin reset

**Steps:**
1. Admin resets a user's password (see Test Case 3.5)
2. User logs in with temporary password
3. Attempt to navigate to dashboard

**Expected Result:**
- User is automatically redirected to Profile page
- Warning message: "You must change your password to continue"
- User cannot navigate elsewhere until password is changed
- After changing password, user can access all features

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 2.3: Password Validation
**Objective:** Verify password requirements are enforced

**Steps:**
1. Go to Profile page
2. Try to set password less than 8 characters
3. Try mismatched password and confirmation

**Expected Result:**
- Error message for password too short
- Error message for mismatched passwords
- Password change is prevented

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 2 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 3. User Management (Admin Only)

### Test Case 3.1: View Users List
**Objective:** Verify admin can view all users

**Steps:**
1. Log in as admin
2. Navigate to Admin page
3. View users table

**Expected Result:**
- All users are displayed in a table
- Columns show: Email, Name, Role, MFA, Status
- Table is scrollable if needed
- No cut-off text or options

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 3.2: Create New User
**Objective:** Verify admin can create new users

**Steps:**
1. Click "Create user" button
2. Fill in email, full name, password
3. Select role from dropdown
4. Set Active toggle
5. Click "Create user" in dialog

**Expected Result:**
- Dialog opens with form
- User is created successfully
- New user appears in table
- Dialog closes automatically
- User can log in with new credentials

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 3.3: Update User Role
**Objective:** Verify admin can change user roles

**Steps:**
1. In users table, find a user
2. Click role dropdown
3. Select different role
4. Verify change

**Expected Result:**
- Role dropdown is accessible
- All role options visible (Admin, Complaints Handler, Complaints Manager, Reviewer, Read only)
- Role updates immediately
- User permissions reflect new role

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 3.4: Toggle User Active Status
**Objective:** Verify admin can activate/deactivate users

**Steps:**
1. Find a user in the table
2. Toggle the "Active/Inactive" switch
3. Verify status chip updates

**Expected Result:**
- Switch has label showing current state
- Toggling switch updates user status
- Status chip reflects change (Active/Disabled)
- Inactive users cannot log in

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 3.5: Reset User Password
**Objective:** Verify admin can reset user passwords

**Steps:**
1. Click "Reset password" button for a user
2. View temporary password in dialog
3. Copy password to clipboard
4. Close dialog

**Expected Result:**
- Dialog opens showing temporary password
- Password is clearly displayed
- Copy button works
- User must change password on next login (see Test Case 2.2)

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 3.6: Reset MFA
**Objective:** Verify admin can reset user MFA

**Steps:**
1. Find a user with MFA enabled
2. Click "Reset MFA" button
3. Verify MFA is disabled

**Expected Result:**
- MFA is reset successfully
- MFA status chip shows "Disabled"
- User can set up MFA again if needed

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 3.7: View MFA Recovery Codes
**Objective:** Verify recovery codes can be viewed

**Steps:**
1. Click on a user row in the table
2. View recovery codes section

**Expected Result:**
- Row expands to show recovery codes
- Codes are displayed in readable format
- Codes can be copied if needed

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 3 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 4. Dashboard & Metrics

### Test Case 4.1: View Dashboard
**Objective:** Verify dashboard loads and displays metrics

**Steps:**
1. Log in as any user
2. Navigate to Dashboard (default page)

**Expected Result:**
- Dashboard loads without errors
- Key metrics are displayed:
  - Total complaints count
  - Open vs Closed counts
  - SLA metrics (acknowledgment, final response)
  - Workload distribution
  - Outcome statistics
- Charts/graphs render correctly

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 4.2: Dashboard Auto-Refresh
**Objective:** Verify dashboard updates after creating complaint

**Steps:**
1. View dashboard metrics
2. Create a new complaint (see Test Case 5.1)
3. Navigate back to dashboard

**Expected Result:**
- Dashboard automatically refreshes
- Metrics update to reflect new complaint
- No manual refresh needed

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 4.3: Queue Tabs
**Objective:** Verify complaint queue tabs work

**Steps:**
1. On dashboard, view different queue tabs:
   - "My Complaints"
   - "Unassigned"
   - "SLA Breached"
   - "Oldest First"
2. Verify each tab shows correct complaints

**Expected Result:**
- Each tab filters complaints correctly
- "My Complaints" shows only assigned to current user
- "Unassigned" shows complaints with no handler
- "SLA Breached" shows complaints past due dates
- "Oldest First" shows oldest complaints first

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 4 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 5. Complaint Management

### Test Case 5.1: Create New Complaint
**Objective:** Verify users can create complaints

**Steps:**
1. Click "New" button in navigation
2. Fill in complaint wizard:
   - Complainant details (name, email, phone, address)
   - Complaint details (description, category, source, received date)
   - Policy information (policy number, insurer, broker, product)
   - FCA complaint flag if applicable
   - Vulnerability flag if applicable
3. Submit complaint

**Expected Result:**
- Wizard guides through all steps
- All required fields are validated
- Complaint is created successfully
- User is redirected to complaint detail page
- Complaint reference number is generated

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.2: View Complaint Details
**Objective:** Verify complaint detail page displays all information

**Steps:**
1. Navigate to a complaint from dashboard or list
2. Review all tabs:
   - Overview
   - Communications
   - Outcome & Redress
   - Tasks
   - Events

**Expected Result:**
- All complaint information is displayed correctly
- Tabs switch smoothly
- Data is formatted properly
- Dates are readable

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.3: Update Complaint Details
**Objective:** Verify complaints can be updated

**Steps:**
1. Open a complaint
2. Update fields (category, description, etc.)
3. Save changes

**Expected Result:**
- Changes are saved successfully
- Updated information is displayed
- Event is logged in Events tab

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.4: Acknowledge Complaint
**Objective:** Verify complaints can be acknowledged

**Steps:**
1. Open a new complaint
2. Click "Acknowledge" button
3. Verify acknowledgment

**Expected Result:**
- Complaint status changes to "Acknowledged"
- Acknowledgment date is recorded
- Event is logged
- SLA tracking begins

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.5: Start Investigation
**Objective:** Verify complaints can move to investigation

**Steps:**
1. Open an acknowledged complaint
2. Click "Move to investigation" button

**Expected Result:**
- Status changes to "In Investigation"
- Event is logged
- Complaint appears in investigation queue

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.6: Record Outcome
**Objective:** Verify outcomes can be recorded

**Steps:**
1. Open a complaint in investigation
2. Go to "Outcome & Redress" tab
3. Select outcome type (Upheld, Partially Upheld, Not Upheld, Withdrawn, Out of Scope)
4. Add outcome notes
5. Save outcome

**Expected Result:**
- Outcome is saved successfully
- Outcome type and notes are displayed
- Event is logged
- Outcome can be edited if needed

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.7: Issue Final Response
**Objective:** Verify final response can be issued

**Steps:**
1. Ensure complaint has an outcome recorded
2. Click "Issue Final Response" button OR add communication with "Final Response" checked

**Expected Result:**
- Final response is issued
- Status changes to "Final Response Issued"
- Final response date is recorded
- Final response SLA is checked
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.8: Close Complaint (Standard)
**Objective:** Verify complaints can be closed

**Steps:**
1. Open complaint with final response issued
2. Click "Close" button
3. Optionally add close date and comment
4. Confirm closure

**Expected Result:**
- Complaint status changes to "Closed"
- Close date is recorded
- Comment is saved if provided
- Event is logged
- Complaint appears in closed metrics

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.9: Close as Non-Reportable
**Objective:** Verify complaints can be closed as non-reportable

**Steps:**
1. Open a complaint that should be non-reportable
2. Click "Close as non-reportable" button
3. Add close date and comment if needed
4. Confirm

**Expected Result:**
- Complaint is marked as non-reportable
- Status changes to "Closed"
- Non-reportable flag is set
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.10: Reopen Closed Complaint
**Objective:** Verify closed complaints can be reopened

**Steps:**
1. Open a closed complaint
2. Click "Reopen" button
3. Enter reopen reason and date
4. Confirm reopening

**Expected Result:**
- Complaint status changes to "Reopened"
- Reopen reason and date are recorded
- Complaint appears in open queues
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 5.11: Delete Complaint (Admin Only)
**Objective:** Verify admin can delete complaints

**Steps:**
1. Log in as admin
2. Open a complaint
3. Click "Delete" button in admin section
4. Confirm deletion in dialog

**Expected Result:**
- Warning dialog appears
- Deletion confirmation required
- Complaint and all related data are deleted
- User is redirected to complaints list
- Complaint no longer appears anywhere

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 5 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 6. Communications & Attachments

### Test Case 6.1: Add Communication
**Objective:** Verify communications can be added to complaints

**Steps:**
1. Open a complaint
2. Go to "Communications" tab
3. Fill in communication form:
   - Channel (email, phone, letter, web, etc.)
   - Direction (inbound/outbound)
   - Summary
   - Occurred date/time
4. Submit

**Expected Result:**
- Communication is added successfully
- Appears in communications list
- Date and details are correct
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 6.2: Upload Attachment
**Objective:** Verify file attachments can be uploaded

**Steps:**
1. Add a communication (see Test Case 6.1)
2. Select one or more files to attach
3. Upload files
4. Verify attachment appears

**Expected Result:**
- Files upload successfully
- File names are displayed
- Files can be downloaded by clicking
- File size limits are enforced (10MB default)
- Multiple files can be attached

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 6.3: Download Attachment
**Objective:** Verify attachments can be downloaded

**Steps:**
1. Open a complaint with attachments
2. Click on an attachment file name
3. Verify download

**Expected Result:**
- File downloads successfully
- File opens correctly
- Original file name is preserved

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 6.4: Final Response with Attachment
**Objective:** Verify final response can include attachments

**Steps:**
1. Add a communication
2. Check "Final Response" checkbox
3. Attach files
4. Submit

**Expected Result:**
- Communication is marked as final response
- Attachments are included
- Final response is automatically issued (if outcome exists)
- Status updates accordingly

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 6 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 7. Redress Management

### Test Case 7.1: Create Redress Payment
**Objective:** Verify redress payments can be created

**Steps:**
1. Open a complaint with outcome recorded
2. Go to "Outcome & Redress" tab
3. Click to add redress
4. Fill in:
   - Payment type (financial loss, interest, distress, etc.)
   - Amount (if monetary)
   - Status (pending, authorised, paid)
   - Notes
   - Rationale
   - Action description (if non-monetary)
   - Approval status
5. Save

**Expected Result:**
- Redress payment is created
- Appears in redress list
- All fields are saved correctly
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 7.2: Update Redress Payment
**Objective:** Verify redress payments can be updated

**Steps:**
1. Find an existing redress payment
2. Update status, amount, or other fields
3. Save changes

**Expected Result:**
- Changes are saved successfully
- Updated information is displayed
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 7.3: Non-Monetary Redress
**Objective:** Verify non-monetary redress can be recorded

**Steps:**
1. Create redress with type "Apology / Explanation" or "Remedial Action"
2. Fill in action description
3. Set action status
4. Save

**Expected Result:**
- Non-monetary redress is saved
- Action description and status are recorded
- No amount field required
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 7 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 8. Task Management

### Test Case 8.1: Create Task
**Objective:** Verify tasks can be added to complaints

**Steps:**
1. Open a complaint
2. Go to "Tasks" tab
3. Click to add task
4. Fill in:
   - Title
   - Description
   - Due date
   - Status
   - Assign to user (optional)
   - Mark as checklist item if needed
5. Save

**Expected Result:**
- Task is created successfully
- Appears in tasks list
- All fields are saved
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 8.2: Update Task Status
**Objective:** Verify task status can be updated

**Steps:**
1. Find a task
2. Change status (open, in progress, completed)
3. Save

**Expected Result:**
- Status updates successfully
- Task list reflects new status
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 8 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 9. Escalation

### Test Case 9.1: Escalate Complaint
**Objective:** Verify complaints can be escalated

**Steps:**
1. Open a complaint
2. Click "Escalate" button
3. Select a complaints manager from dropdown
4. Confirm escalation

**Expected Result:**
- Complaint is marked as escalated
- Escalation manager is assigned
- Escalation indicator is visible
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 9.2: Remove Escalation
**Objective:** Verify escalations can be removed

**Steps:**
1. Open an escalated complaint
2. Click "Remove escalation" button

**Expected Result:**
- Escalation is removed
- Escalation indicator disappears
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 9.3: Change Escalation Manager
**Objective:** Verify escalation manager can be changed

**Steps:**
1. Open an escalated complaint
2. Click "Change escalation" button
3. Select different manager
4. Confirm

**Expected Result:**
- Escalation manager is updated
- New manager is assigned
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 9 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 10. Assignment & Workload

### Test Case 10.1: Assign Complaint to Handler
**Objective:** Verify complaints can be assigned

**Steps:**
1. Open an unassigned complaint
2. (Admin) Use assignment dropdown to select handler
3. OR (Handler) Click to self-assign if unassigned
4. Verify assignment

**Expected Result:**
- Complaint is assigned to selected handler
- Handler name appears in complaint details
- Complaint appears in handler's "My Complaints" queue
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 10.2: Self-Assignment (Complaints Handler)
**Objective:** Verify handlers can self-assign unassigned complaints

**Steps:**
1. Log in as complaints handler
2. Find an unassigned complaint
3. Click to self-assign

**Expected Result:**
- Complaint is assigned to current user
- Handler can only self-assign (not assign to others)
- Cannot assign already-assigned complaints
- Event is logged

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 10.3: Workload Distribution
**Objective:** Verify workload metrics are accurate

**Steps:**
1. View dashboard
2. Check workload distribution
3. Assign/unassign complaints
4. Verify metrics update

**Expected Result:**
- Workload shows correct distribution by handler
- Metrics update when assignments change
- Unassigned complaints are counted separately

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 10 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 11. Reference Data Management (Admin Only)

### Test Case 11.1: View Reference Data
**Objective:** Verify reference data can be viewed

**Steps:**
1. Log in as admin
2. Navigate to Reference page
3. View Products, Insurers, and Brokers tabs

**Expected Result:**
- All reference items are displayed
- Data is organized by type
- Lists are searchable/filterable

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 11.2: Create Reference Item
**Objective:** Verify reference items can be created

**Steps:**
1. Go to Reference page
2. Select tab (Products, Insurers, or Brokers)
3. Click to create new item
4. Enter name
5. Save

**Expected Result:**
- New item is created
- Appears in list
- Can be selected in complaint forms

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 11.3: Import Reference Data
**Objective:** Verify bulk import works (if implemented)

**Steps:**
1. Go to Reference page
2. Use import function
3. Upload CSV file with reference data

**Expected Result:**
- Data is imported successfully
- Items appear in list
- Errors are reported if any

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 11 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 12. Role-Based Permissions

### Test Case 12.1: Admin Permissions
**Objective:** Verify admin has all permissions

**Steps:**
1. Log in as admin
2. Verify access to:
   - User management
   - Reference data
   - All complaint functions
   - Delete complaints

**Expected Result:**
- Admin can access all features
- All buttons/options are visible
- No permission errors

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 12.2: Complaints Handler Permissions
**Objective:** Verify complaints handler permissions

**Steps:**
1. Log in as complaints handler
2. Verify can:
   - Create complaints
   - Update complaints
   - Record outcomes
   - Close complaints
   - Issue final response
   - Reopen complaints
   - Create redress payments
   - Add communications
   - Add tasks
   - Escalate complaints
   - Self-assign complaints
3. Verify cannot:
   - Access user management
   - Access reference data
   - Assign complaints to others
   - Delete complaints

**Expected Result:**
- All allowed functions work
- Restricted functions are hidden/blocked
- Appropriate error messages if access attempted

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 12.3: Read-Only Permissions
**Objective:** Verify read-only user restrictions

**Steps:**
1. Log in as read-only user
2. Attempt to create/edit/delete complaints
3. Attempt to access admin functions

**Expected Result:**
- Can view complaints and data
- Cannot create or modify anything
- Buttons are disabled
- Appropriate restrictions in place

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 12 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 13. Navigation & UI/UX

### Test Case 13.1: Navigation Menu
**Objective:** Verify navigation works correctly

**Steps:**
1. Log in
2. Click each navigation item:
   - Dashboard
   - Complaints
   - New (create complaint)
   - Profile
   - Admin (if admin)
   - Reference (if admin)
3. Verify routing

**Expected Result:**
- All links work correctly
- Correct pages load
- Navigation highlights current page
- No broken links

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 13.2: Page Refresh
**Objective:** Verify pages work after refresh

**Steps:**
1. Navigate to complaint detail page (e.g., `/complaints/123`)
2. Refresh browser (F5 or Cmd+R)
3. Verify page loads correctly

**Expected Result:**
- Page loads successfully after refresh
- No 404 errors
- All data is displayed
- User remains logged in

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 13.3: Responsive Design
**Objective:** Verify UI works on different screen sizes

**Steps:**
1. Test on desktop (1920x1080 or similar)
2. Test on tablet size (resize browser)
3. Test on mobile size (resize browser)

**Expected Result:**
- Layout adapts to screen size
- No horizontal scrolling on desktop
- Tables scroll horizontally on mobile if needed
- Buttons and forms remain usable
- Text is readable

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 13.4: Error Handling
**Objective:** Verify errors are handled gracefully

**Steps:**
1. Attempt invalid operations (e.g., close complaint without outcome)
2. Submit forms with missing required fields
3. Try to access restricted pages

**Expected Result:**
- Clear error messages are displayed
- Forms highlight missing fields
- 403/404 errors show appropriate messages
- No unhandled errors in console
- Application remains stable

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 13 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 14. Performance & Reliability

### Test Case 14.1: Page Load Performance
**Objective:** Verify pages load in reasonable time

**Steps:**
1. Navigate between pages
2. Monitor load times
3. Test with large datasets (if available)

**Expected Result:**
- Pages load within 2-3 seconds
- No excessive loading spinners
- Smooth transitions between pages

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 14.2: Concurrent Users
**Objective:** Verify system handles multiple users

**Steps:**
1. Have multiple users log in simultaneously
2. Have users perform different operations
3. Verify no conflicts or data loss

**Expected Result:**
- Multiple users can work simultaneously
- No data conflicts
- Changes are saved correctly
- No performance degradation

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 14.3: Data Persistence
**Objective:** Verify data is saved correctly

**Steps:**
1. Create/update various records
2. Log out and log back in
3. Verify all changes are persisted

**Expected Result:**
- All data is saved correctly
- No data loss
- Changes persist after logout/login
- Database integrity maintained

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 14 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## 15. Security

### Test Case 15.1: HTTPS Enforcement
**Objective:** Verify all traffic uses HTTPS

**Steps:**
1. Access application via HTTP
2. Verify redirect to HTTPS
3. Check browser security indicators

**Expected Result:**
- HTTP automatically redirects to HTTPS
- Valid SSL certificate
- Browser shows secure connection
- No mixed content warnings

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 15.2: Session Security
**Objective:** Verify sessions are secure

**Steps:**
1. Log in
2. Check token storage
3. Verify token is used for API calls
4. Log out and verify token is cleared

**Expected Result:**
- Tokens are stored securely
- API calls include authentication
- Logout clears all session data
- Expired tokens are rejected

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

### Test Case 15.3: Input Validation
**Objective:** Verify input is validated and sanitized

**Steps:**
1. Attempt to submit malicious input (SQL injection, XSS attempts)
2. Try to upload invalid file types
3. Submit extremely long text

**Expected Result:**
- Malicious input is rejected or sanitized
- File type validation works
- Length limits are enforced
- No security vulnerabilities exposed

**Actual Result:** ________________  
**Status:** ⬜ Pass ⬜ Fail  
**Notes:** ________________

---

**Section 15 Sign-off:**
- **Tester:** ________________
- **Date:** ________________
- **Status:** ⬜ Complete ⬜ Issues Found

---

## Issues & Observations

**Critical Issues:**
1. ________________________________
2. ________________________________
3. ________________________________

**Minor Issues:**
1. ________________________________
2. ________________________________
3. ________________________________

**Enhancement Suggestions:**
1. ________________________________
2. ________________________________
3. ________________________________

---

## Final Sign-Off

**Overall Assessment:**
- ⬜ System is ready for production
- ⬜ System requires fixes before production
- ⬜ System requires significant rework

**Tester Name:** ________________  
**Role:** ________________  
**Date:** ________________  
**Signature:** ________________

**Approver Name:** ________________  
**Role:** ________________  
**Date:** ________________  
**Signature:** ________________

**Additional Comments:**
________________________________
________________________________
________________________________

---

## Appendix: Test Data

**Test Users:**
- Admin: ________________ / ________________
- Complaints Handler: ________________ / ________________
- Complaints Manager: ________________ / ________________
- Reviewer: ________________ / ________________
- Read-Only: ________________ / ________________

**Test Complaints:**
- Complaint Reference 1: ________________
- Complaint Reference 2: ________________
- Complaint Reference 3: ________________

---

*End of UAT Document*

