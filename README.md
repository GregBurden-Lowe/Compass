# Insurance Complaints Management (MVP)

FastAPI + React implementation for FCA DISP-aligned complaints handling: intake, workflow, communications, outcomes/redress, audit and MI views. Targeted for Docker Compose on DigitalOcean.

## Features
- Complaint lifecycle: New → Acknowledged → In Investigation → Response Drafted → Final Response Issued → Closed (with reopen).
- SLA tracking: acknowledgement (default 2 business days) and final response (8 weeks) with breach flags.
- Role-based access (Admin, ComplaintsHandler, Reviewer, ReadOnly) via JWT.
- Communications log with attachment metadata and local file storage.
- Outcome + redress recording (authorised/paid), governance audit events, timeline events.
- Search/filter: reference, complainant, policy, status, handler, product, vulnerability, overdue.
- Reporting SQL views for Power BI consumption (volumes by month/handler/product, timeliness, outcomes/redress totals, vulnerable counts, breaches).

## User roles
- **Admin** – full access; can create/update users and assign roles; can perform all complaint actions including issuing final responses and closing.
- **Complaints Handler** – can create/edit complaints, add communications, progress investigations, and close where allowed; no user management.
- **Reviewer** – can review/approve/issue final responses; can edit complaints and add communications; no user management.
- **ReadOnly** – view-only; cannot create or update complaints or users.

## Quick start (Docker)
1. Copy environment template and adjust if needed:
   ```bash
   cp .env.example .env
   ```
2. Build and start:
   ```bash
   docker compose up --build
   ```
   - Services: Postgres (`db`), FastAPI (`backend` on :8000), React (`frontend` on :5173).
   - Backend runs Alembic migrations and seeds demo users/complaints on start.
3. Sign in via UI (http://localhost:5173) using seeded users, e.g. `admin@example.com` / `password123`.
4. API docs available at `http://localhost:8000/docs`.

## Local backend (optional)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed.seed_data
uvicorn app.main:app --reload
```

## Frontend (optional local)
```bash
cd frontend
npm install
npm run dev
```

## Environment flags
- `DEMO_MODE=true` enables “demo” login on the frontend (no credentials) and allows reseeding data on backend start.
- `ACK_SLA_DAYS`, `FINAL_RESPONSE_SLA_WEEKS` configure SLA calculations.
- `CORS_ORIGINS`, `SECRET_KEY`, `DATABASE_URL` as standard.

## Data model (tables)
- `users`, `complaints`, `complainants`, `policies`, `complaint_events`, `communications`, `attachments`, `tasks`, `outcomes`, `redresspayment`, `auditlog`.
- Reporting views: `vw_complaints_by_month`, `vw_timeliness`, `vw_outcomes_redress`, `vw_vulnerable_counts`.

## Workflow rules
- Final response endpoint blocked unless an outcome is present.
- Status transitions recorded in `complaint_events`; SLA breach flags updated on read.
- Due dates auto-calculated on creation (business-day ack, 8-week final).
- Role enforcement: ReadOnly cannot mutate; Reviewer/Admin needed for final response/close.

## Testing
```bash
cd backend
pytest
```
Includes unit tests for SLA calculations, workflow transitions, and a basic API search/filter path.

## Security and hygiene
- JWT auth with hashed passwords (bcrypt). Seed passwords are for local/demo only.
- Input validation via Pydantic; file uploads stored under `storage/attachments` with metadata in DB.
- Structured logging to stdout (container friendly). Rate limiting is not enabled by default.

## FCA DISP compliance notes (non-legal)
- Supports logging, acknowledgements, investigation steps, communication logging, outcome/redress recording, SLA tracking (2-day ack/8-week final), reopen/escalate flag, governance audit, and MI views for timeliness/outcomes/vulnerability/breaches.
- Templates for acknowledgement/final responses are placeholders; firm-specific wording and approval workflows may be required.
- No automated ombudsman referral workflow; integration would need to be added.
- Holidays are not modelled in SLA (business days skip weekends only).
- Document storage is local-only; production-grade secure storage/virus scanning should be added.

## Useful commands
- `docker compose up --build` – run full stack.
- `alembic upgrade head` – apply migrations.
- `python -m app.seed.seed_data` – reseed demo data.
- `npm run dev` (frontend) / `uvicorn app.main:app --reload` (backend) – local dev servers.

