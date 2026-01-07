# Power BI Integration Guide

This guide explains how to connect Power BI to the Compass complaints database for reporting and analytics.

## Overview

The Compass application uses **PostgreSQL** (DigitalOcean managed database) and includes several pre-built reporting views optimized for Power BI consumption.

## Connection Methods

### Option 1: Direct Database Connection (Recommended)

**Best for:** Large datasets, real-time data, best performance

#### Prerequisites
1. **Database Connection Details** from your DigitalOcean dashboard:
   - Host: `db-postgresql-lon1-XXXXX-do-user-XXXXX-0.k.db.ondigitalocean.com`
   - Port: `25060` (or your assigned port)
   - Database: `defaultdb` (or your database name)
   - Username: `doadmin` (or your database user)
   - Password: (from your DigitalOcean dashboard)
   - SSL Mode: `require`

2. **Create a Read-Only Database User** (Recommended for security):
   ```sql
   -- Connect to your database as admin, then run:
   CREATE USER powerbi_reader WITH PASSWORD 'your_secure_password';
   GRANT CONNECT ON DATABASE your_database_name TO powerbi_reader;
   GRANT USAGE ON SCHEMA public TO powerbi_reader;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO powerbi_reader;
   GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO powerbi_reader;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powerbi_reader;
   ```

#### Power BI Connection Steps

1. **Open Power BI Desktop**
2. **Get Data** → **Database** → **PostgreSQL database**
3. **Enter connection details:**
   ```
   Server: db-postgresql-lon1-XXXXX-do-user-XXXXX-0.k.db.ondigitalocean.com,25060
   Database: defaultdb
   Data Connectivity mode: Import (or DirectQuery for live data)
   ```
4. **Click OK** and enter credentials:
   - Username: `powerbi_reader` (or your read-only user)
   - Password: (your password)
5. **Select tables/views** to import:
   - Recommended views: `vw_complaints_by_month`, `vw_timeliness`, `vw_outcomes_redress`, `vw_vulnerable_counts`
   - Or use the comprehensive view: `vw_complaints_reporting` (see below)
   - Or import raw tables: `complaint`, `complainant`, `outcome`, `redresspayment`, etc.

#### Connection String Format
```
Host=db-postgresql-lon1-XXXXX-do-user-XXXXX-0.k.db.ondigitalocean.com;Port=25060;Database=defaultdb;Username=powerbi_reader;Password=your_password;SSL Mode=Require;
```

### Option 2: API Endpoints (Alternative)

**Best for:** Smaller datasets, when you need filtered/aggregated data, or when direct DB access isn't available

#### Available Endpoints
- `GET /api/complaints` - List all complaints (with filters)
- `GET /api/complaints/metrics` - Aggregated metrics

#### Power BI Connection Steps

1. **Get Data** → **Web**
2. **Enter API URL:**
   ```
   https://compass.lpgapps.work/api/complaints
   ```
3. **Advanced options:**
   - Add HTTP headers: `Authorization: Bearer YOUR_TOKEN`
   - Or use API key authentication if configured

**Note:** API method requires authentication and may have rate limits. Direct database connection is recommended.

## Available Reporting Views

### 1. `vw_complaints_by_month`
Monthly complaint counts grouped by product, scheme, and assigned handler.

**Columns:**
- `month` - Month/year of complaint receipt
- `product` - Product type
- `scheme` - Scheme type
- `assigned_handler_id` - Handler UUID
- `count` - Number of complaints

### 2. `vw_timeliness`
SLA performance metrics for each complaint.

**Columns:**
- `id` - Complaint ID
- `reference` - Complaint reference
- `received_at` - Date complaint received
- `acknowledged_at` - Date acknowledged
- `closed_at` - Date closed
- `ack_breached` - Boolean: Acknowledgement SLA breached
- `final_breached` - Boolean: Final response SLA breached
- `days_to_ack` - Days from receipt to acknowledgement
- `days_open` - Days from receipt to closure (or current date if open)

### 3. `vw_outcomes_redress`
Outcome and redress payment summary per complaint.

**Columns:**
- `reference` - Complaint reference
- `outcome` - Outcome type (upheld, partially_upheld, not_upheld, etc.)
- `total_redress` - Sum of all redress payments for this complaint

### 4. `vw_vulnerable_counts`
Vulnerable customer complaint counts by product and scheme.

**Columns:**
- `product` - Product type
- `scheme` - Scheme type
- `vulnerable_count` - Number of vulnerable customer complaints
- `total_count` - Total complaints

### 5. `vw_complaints_reporting` (Comprehensive View)
A comprehensive view combining all complaint data for easy reporting.

**See below for creation script.**

## Creating Additional Reporting Views

If you need a comprehensive view with all complaint details, you can create `vw_complaints_reporting`:

```sql
CREATE OR REPLACE VIEW vw_complaints_reporting AS
SELECT 
    c.id,
    c.reference,
    c.status,
    c.source,
    c.received_at,
    c.description,
    c.category,
    c.reason,
    c.fca_complaint,
    c.fos_complaint,
    c.fos_reference,
    c.fos_referred_at,
    c.vulnerability_flag,
    c.vulnerability_notes,
    c.non_reportable,
    c.product,
    c.scheme,
    c.broker,
    c.insurer,
    c.policy_number,
    c.ack_due_at,
    c.final_due_at,
    c.acknowledged_at,
    c.final_response_at,
    c.closed_at,
    c.ack_breached,
    c.final_breached,
    c.is_escalated,
    c.assigned_handler_id,
    u.full_name AS assigned_handler_name,
    c.created_at,
    c.updated_at,
    -- Complainant details
    comp.full_name AS complainant_name,
    comp.email AS complainant_email,
    comp.phone AS complainant_phone,
    -- Outcome details
    o.outcome AS outcome_type,
    o.notes AS outcome_notes,
    o.recorded_at AS outcome_recorded_at,
    -- Redress summary
    COALESCE(SUM(r.amount), 0) AS total_redress_amount,
    COUNT(r.id) AS redress_payment_count,
    -- Communication counts
    COUNT(DISTINCT comm.id) AS communication_count,
    -- Event counts
    COUNT(DISTINCT e.id) AS event_count
FROM complaint c
LEFT JOIN "user" u ON c.assigned_handler_id = u.id
LEFT JOIN complainant comp ON comp.complaint_id = c.id
LEFT JOIN outcome o ON o.complaint_id = c.id
LEFT JOIN redresspayment r ON r.complaint_id = c.id
LEFT JOIN communication comm ON comm.complaint_id = c.id
LEFT JOIN complaint_event e ON e.complaint_id = c.id
GROUP BY 
    c.id, c.reference, c.status, c.source, c.received_at, c.description,
    c.category, c.reason, c.fca_complaint, c.fos_complaint, c.fos_reference,
    c.fos_referred_at, c.vulnerability_flag, c.vulnerability_notes,
    c.non_reportable, c.product, c.scheme, c.broker, c.insurer,
    c.policy_number, c.ack_due_at, c.final_due_at, c.acknowledged_at,
    c.final_response_at, c.closed_at, c.ack_breached, c.final_breached,
    c.is_escalated, c.assigned_handler_id, u.full_name, c.created_at,
    c.updated_at, comp.full_name, comp.email, comp.phone, o.outcome,
    o.notes, o.recorded_at;
```

## Security Considerations

1. **Use Read-Only Database User**: Create a dedicated read-only user for Power BI
2. **SSL Required**: Always use SSL when connecting to DigitalOcean databases
3. **IP Whitelisting**: Consider restricting database access to specific IPs in DigitalOcean
4. **Token Expiration**: If using API method, implement token refresh logic
5. **Data Refresh Schedule**: Set appropriate refresh schedules in Power BI Service

## Data Refresh

### Import Mode (Recommended for most cases)
- Data is imported into Power BI
- Set refresh schedule in Power BI Service (Gateway not required)
- Refresh frequency: Up to 8 times per day (Power BI Pro) or 48 times per day (Power BI Premium)

### DirectQuery Mode
- Queries database in real-time
- Requires On-Premises Data Gateway for cloud databases
- Better for large datasets that change frequently
- May have performance impact on database

## Recommended Power BI Setup

1. **Create a dedicated workspace** for Compass reports
2. **Import the reporting views** (or comprehensive view)
3. **Set up relationships** between views if using multiple
4. **Create measures** for:
   - SLA compliance percentages
   - Average resolution times
   - Complaint volumes by period
   - Outcome distributions
   - Redress totals
5. **Schedule automatic refresh** (daily recommended)

## Troubleshooting

### Connection Issues
- Verify SSL mode is set to "Require"
- Check firewall rules allow your IP
- Verify credentials are correct
- Test connection using `psql` or pgAdmin first

### Performance Issues
- Use views instead of raw tables when possible
- Filter data at the database level, not in Power BI
- Consider using DirectQuery for very large datasets
- Add indexes on frequently filtered columns

### Data Not Updating
- Check refresh schedule in Power BI Service
- Verify database user has SELECT permissions
- Check for any errors in refresh history

## Example Power BI Queries

### Get all complaints with FOS referrals
```sql
SELECT * FROM vw_complaints_reporting 
WHERE fos_complaint = true
ORDER BY fos_referred_at DESC;
```

### Get SLA breach summary
```sql
SELECT 
    COUNT(*) as total_complaints,
    SUM(CASE WHEN ack_breached THEN 1 ELSE 0 END) as ack_breaches,
    SUM(CASE WHEN final_breached THEN 1 ELSE 0 END) as final_breaches
FROM vw_timeliness;
```

## Support

For database connection issues, check:
- DigitalOcean database dashboard for connection details
- Database logs for connection attempts
- Power BI refresh history for error messages

