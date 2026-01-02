# Complaints Handler Role Permissions

## ✅ Permissions Granted

### Complaint Management
- **Create complaints** - `POST /complaints`
- **View complaints** - `GET /complaints/{id}` (all authenticated users)
- **Update complaints** - `PATCH /complaints/{id}` (edit complaint details)
- **Acknowledge complaints** - `POST /complaints/{id}/acknowledge`
- **Start investigation** - `POST /complaints/{id}/investigate`
- **Record outcomes** - `POST /complaints/{id}/outcome`
- **Close complaints** - `POST /complaints/{id}/close`
- **Close as non-reportable** - `POST /complaints/{id}/close-non-reportable`
- **Escalate complaints** - `POST /complaints/{id}/escalate`
- **Remove escalation** - `PATCH /complaints/{id}` (set `is_escalated: false`)

### Assignment
- **Self-assign complaints** - `POST /complaints/{id}/assign` (only if unassigned, can only assign to themselves)

### Communications
- **Add communications** - `POST /complaints/{id}/communications` (including attachments)
- **View events** - `GET /complaints/{id}/events` (all authenticated users)

### Redress
- **Update redress payments** - `PATCH /complaints/{id}/redress/{redress_id}` (update status, notes, etc.)

### Tasks
- **Add tasks** - `POST /complaints/{id}/tasks`

### Metrics & Lists
- **View dashboard metrics** - `GET /complaints/metrics` (all authenticated users)
- **List complaints** - `GET /complaints` (all authenticated users)

## ❌ Permissions NOT Granted

### Complaint Management
- **Issue final response** - `POST /complaints/{id}/final-response` (requires admin/reviewer/complaints_manager)
- **Reopen complaints** - `POST /complaints/{id}/reopen` (requires admin/reviewer/complaints_manager)

### Redress
- **Create redress payments** - `POST /complaints/{id}/redress` (requires admin/reviewer/complaints_manager)
  - Note: Can update existing redress payments, but cannot create new ones

### User Management
- **Manage users** - All endpoints in `/users` (admin only)
- **Reset passwords** - `POST /users/{id}/reset-password` (admin only)

### Reference Data
- **Manage reference data** - All endpoints in `/reference` (admin only)
  - Products, Brokers, Insurers

### Authentication
- **Change password** - `POST /auth/password/change` (all authenticated users can change their own password)
- **MFA setup** - Available to all authenticated users

## Special Restrictions

### Assignment
- Complaints handlers can only **self-assign** unassigned complaints
- Cannot assign complaints to other users
- Cannot reassign already-assigned complaints

### Final Response
- Cannot issue final response directly
- However, can add a communication with `is_final_response: true`, which will automatically issue the final response (if outcome exists)

## Summary

Complaints handlers have comprehensive permissions to:
- Create and manage complaints through most of their lifecycle
- Record outcomes and close complaints
- Add communications and tasks
- Update redress payments (but not create them)
- Escalate complaints

They are restricted from:
- Issuing final responses directly (though can do so via communication)
- Reopening closed complaints
- Creating new redress payments
- Managing users or reference data
- Assigning complaints to others (only self-assignment allowed)

