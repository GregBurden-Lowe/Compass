# SLA (Service Level Agreement) Documentation

## Overview

The Complaints Management system implements two SLAs aligned with FCA DISP requirements:

1. **Acknowledgement SLA**: Time to acknowledge receipt of a complaint
2. **Final Response SLA**: Time to issue a final response to the complainant

## SLA Configuration

### Environment Variables

Both SLAs are configurable via environment variables in `.env`:

- `ACK_SLA_DAYS=2` - Number of **business days** to acknowledge a complaint (default: 2)
- `FINAL_RESPONSE_SLA_WEEKS=8` - Number of **calendar weeks** to issue final response (default: 8)

### Default Values

- **Acknowledgement**: 2 business days
- **Final Response**: 8 calendar weeks (56 days)

## SLA Calculation

### Acknowledgement SLA

**Calculation**: `ack_due_at = received_at + ACK_SLA_DAYS business days`

- Uses **business days only** (excludes weekends)
- Calculated when complaint is created
- Stored in `complaint.ack_due_at`
- Breach flag: `complaint.ack_breached`

**Example**:
- Complaint received: Monday, Jan 1
- ACK_SLA_DAYS: 2
- Due date: Wednesday, Jan 3 (2 business days later)

### Final Response SLA

**Calculation**: `final_due_at = received_at + FINAL_RESPONSE_SLA_WEEKS weeks`

- Uses **calendar weeks** (includes weekends)
- Calculated when complaint is created
- Stored in `complaint.final_due_at`
- Breach flag: `complaint.final_breached`

**Example**:
- Complaint received: Jan 1
- FINAL_RESPONSE_SLA_WEEKS: 8
- Due date: Feb 26 (8 weeks = 56 days later)

## Breach Detection

### Automatic Breach Flagging

The system automatically checks and updates breach flags via `refresh_breach_flags()`:

```python
def refresh_breach_flags(complaint: Complaint) -> None:
    now = utcnow()
    ack_due = complaint.ack_due_at
    final_due = complaint.final_due_at
    
    # Acknowledgement breach: not acknowledged AND past due date
    if complaint.acknowledged_at is None and ack_due and now > ack_due:
        complaint.ack_breached = True
    
    # Final response breach: not issued AND past due date
    if complaint.final_response_at is None and final_due and now > final_due:
        complaint.final_breached = True
```

### When Breach Flags Are Updated

Breach flags are refreshed:
- When a complaint is loaded (via `_get_complaint()`)
- When listing complaints (for each complaint)
- When viewing metrics
- Manually via `service.refresh_breach_flags(complaint)`

### Breach Resolution

Breach flags are automatically cleared when:
- **Acknowledgement breach**: Cleared when `acknowledged_at` is set (via acknowledge action)
- **Final response breach**: Cleared when `final_response_at` is set (via issue final response action)

## SLA Metrics

### Dashboard Metrics

The system tracks SLA performance in the `/api/complaints/metrics` endpoint:

#### 30-Day Rolling SLA Performance

- **Acknowledgement SLA**:
  - `sla_30d.ack.on_time`: Count of complaints acknowledged on time
  - `sla_30d.ack.total`: Total complaints with acknowledgement data
  - `sla_30d.ack.on_time_pct`: Percentage on time (null if no data)

- **Final Response SLA**:
  - `sla_30d.final.on_time`: Count of complaints with final response on time
  - `sla_30d.final.total`: Total complaints with final response data
  - `sla_30d.final.on_time_pct`: Percentage on time (null if no data)

#### Open Breaches

- `open_sla_breaches`: Count of open complaints with either `ack_breached` or `final_breached` = true

### Filtering by Breach Status

The complaints list endpoint supports filtering:
- `?overdue=true` - Returns complaints where `ack_breached == true` OR `final_breached == true`

## Database Schema

### Complaint Model Fields

```python
ack_due_at: DateTime          # Calculated due date for acknowledgement
final_due_at: DateTime         # Calculated due date for final response
acknowledged_at: DateTime     # When acknowledgement was sent (null if not acknowledged)
final_response_at: DateTime    # When final response was issued (null if not issued)
ack_breached: Boolean         # True if acknowledgement is overdue
final_breached: Boolean       # True if final response is overdue
```

## Business Logic

### Acknowledgement

- **Action**: User clicks "Acknowledge" on a complaint
- **Sets**: `acknowledged_at = now()`, `status = 'acknowledged'`
- **Clears**: `ack_breached = False` (if previously breached)
- **SLA Check**: If `acknowledged_at <= ack_due_at`, SLA met

### Final Response

- **Action**: User marks a communication as "Final Response" (requires outcome to be recorded first)
- **Sets**: `final_response_at = now()`, `status = 'final_response_issued'`
- **Clears**: `final_breached = False` (if previously breached)
- **SLA Check**: If `final_response_at <= final_due_at`, SLA met

## Code Locations

### SLA Calculation
- **File**: `backend/app/services/complaints.py`
- **Function**: `calculate_slas(received_at: datetime) -> tuple[datetime, datetime]`
- **Called**: When creating a new complaint

### Breach Detection
- **File**: `backend/app/services/complaints.py`
- **Function**: `refresh_breach_flags(complaint: Complaint) -> None`
- **Called**: On complaint load, list, and metrics calculation

### Configuration
- **File**: `backend/app/core/config.py`
- **Fields**: `ack_sla_days`, `final_response_sla_weeks`
- **Environment Variables**: `ACK_SLA_DAYS`, `FINAL_RESPONSE_SLA_WEEKS`

### Date Utilities
- **File**: `backend/app/utils/dates.py`
- **Functions**: `add_business_days()`, `add_weeks()`, `utcnow()`

## Testing

SLA calculation is tested in:
- `backend/app/tests/test_sla.py` - Tests business day calculation
- `backend/app/tests/test_workflow.py` - Tests workflow with SLA deadlines

## Compliance

These SLAs align with FCA DISP (Dispute Resolution) requirements:
- **DISP 1.3.1**: Firms must acknowledge complaints promptly
- **DISP 1.4.1**: Firms must send a final response within 8 weeks

The system ensures compliance by:
1. Automatically calculating due dates on complaint creation
2. Tracking breach status in real-time
3. Reporting SLA performance metrics
4. Flagging overdue complaints for management attention

