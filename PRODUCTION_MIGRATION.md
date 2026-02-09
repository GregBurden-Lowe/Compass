# Production Migration Guide

This document outlines the changes made to prepare the application for production deployment with DigitalOcean managed database.

## Changes Made

### 1. Database Migration to DigitalOcean

- **Removed local PostgreSQL service** from `docker-compose.yml`
- **Updated database connection** to use DigitalOcean managed PostgreSQL
- **Added connection pooling** in `backend/app/db/session.py` for production workloads
- **Updated connection string format** to use `postgresql+psycopg2://` (required for SQLAlchemy)

**Important**: Your DigitalOcean connection string uses `postgresql://` but SQLAlchemy requires `postgresql+psycopg2://`. Update your `.env` file:

```bash
# Change from:
DATABASE_URL=postgresql://doadmin:show-password@db-postgresql-lon1-44495-do-user-24535780-0.k.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# To:
DATABASE_URL=postgresql+psycopg2://doadmin:show-password@db-postgresql-lon1-44495-do-user-24535780-0.k.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

### 2. Security Improvements

- **Updated to pydantic-settings**: Migrated from deprecated `BaseSettings` to `pydantic_settings.BaseSettings`
- **Changed password hashing**: Switched from `pbkdf2_sha256` to `bcrypt` for production-grade security
- **Secret key generation**: Now generates secure random keys by default (override with `SECRET_KEY` env var)
- **Rate limiting**: Added `slowapi` middleware for API rate limiting (configurable via `RATE_LIMIT_PER_MINUTE`)
- **CORS configuration**: Enhanced with production warnings and proper method restrictions
- **API documentation**: Disabled `/docs` and `/redoc` endpoints in production

### 3. Error Handling & Logging

- **Global exception handler**: Added comprehensive error handling for unhandled exceptions
- **Enhanced logging**: Environment-based log levels (DEBUG for local, WARNING for production)
- **Structured logging**: Added request context (path, method, client IP) to error logs
- **Health check**: Enhanced `/health` endpoint with database connectivity checks

### 4. Frontend Production Build

- **Production Dockerfile**: Multi-stage build with nginx for serving static files
- **Nginx configuration**: Optimized with gzip, caching, and security headers
- **SPA routing**: Configured to handle React Router properly

### 5. Configuration Management

- **Environment-based behavior**: Seed data only runs in `DEMO_MODE=true` or `ENVIRONMENT=local`
- **Worker configuration**: Multiple uvicorn workers in production (configurable via `UVICORN_WORKERS`)
- **File upload limits**: Configurable via `MAX_UPLOAD_SIZE_MB` (default: 10MB)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Application Settings
APP_NAME=Complaints Management
ENVIRONMENT=production
DEBUG=false
DEMO_MODE=false

# Security
SECRET_KEY=your-secret-key-here-generate-with-secrets-token-urlsafe-32
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database (DigitalOcean Managed PostgreSQL)
DATABASE_URL=postgresql+psycopg2://doadmin:show-password@db-postgresql-lon1-44495-do-user-24535780-0.k.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# CORS Configuration
# For production, specify exact origins separated by commas
CORS_ORIGINS=https://yourdomain.com

# SLA Configuration
ACK_SLA_DAYS=2
FINAL_RESPONSE_SLA_WEEKS=8

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# File Upload Limits
MAX_UPLOAD_SIZE_MB=10

# Uvicorn Workers (for production)
UVICORN_WORKERS=4
```

## Deployment Steps

1. **Update Database Connection String**
   - Ensure `DATABASE_URL` uses `postgresql+psycopg2://` format
   - Verify SSL mode is set to `require`

2. **Configure Firewall Rules**
   - In DigitalOcean, go to your database → Settings → Trusted Sources
   - Add your application server's IP address(es)

3. **Run Database Migrations**
   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. **Set Production Environment Variables**
   - Update `ENVIRONMENT=production`
   - Set `DEBUG=false`
   - Configure `CORS_ORIGINS` with your production domain(s)
   - Generate a strong `SECRET_KEY`

5. **Build and Deploy**
   ```bash
   docker compose up --build -d
   ```

6. **Verify Health Check**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy", "database": "connected", "environment": "production"}`

## Important Notes

- **Seed Data**: Will NOT run automatically in production (only in `DEMO_MODE=true` or `ENVIRONMENT=local`)
- **API Documentation**: `/docs` and `/redoc` are disabled in production
- **Rate Limiting**: Enabled by default (60 requests/minute, configurable)
- **File Uploads**: Limited to 10MB by default (configurable via `MAX_UPLOAD_SIZE_MB`)
- **Workers**: Uses 4 workers in production (configurable via `UVICORN_WORKERS`)

## Security Checklist

- [ ] Strong `SECRET_KEY` generated and set
- [ ] `CORS_ORIGINS` configured with production domain(s) (not `*`)
- [ ] `DEBUG=false` in production
- [ ] `DEMO_MODE=false` in production
- [ ] Database credentials are secure and not default
- [ ] Firewall rules configured in DigitalOcean
- [ ] SSL/TLS enabled (handled by DigitalOcean database)
- [ ] `.env` file is NOT committed to git (should be in `.gitignore`)

## Run migrations when app reports "legal_hold is missing"

If the backend fails at startup with:

```text
RuntimeError: Database schema is outdated: column complaint.legal_hold is missing. ...
```

then the database the **app** connects to does not have migration 0017 applied. Common causes: different database name in `DATABASE_URL` (e.g. `/defaultdb` vs `/Compass`), or migrations running with a different env than the app.

### Docker (docker-compose on a server/VM)

The backend container runs `start.sh` (alembic then uvicorn) with the same env. If the error still appears, either the **database name** in `DATABASE_URL` is wrong, or something (e.g. connection pooler) is routing the app to a different node.

1. **Check which database the app is using**  
   The error message shows the host and database name (e.g. `.../Compass`). Ensure your `.env` (or env passed to `docker compose`) uses that **exact** database name in `DATABASE_URL`.

2. **Run migrations in a one-off container** (same env as the running app):

   ```bash
   docker compose run --rm backend alembic upgrade head
   ```

   This uses the same `DATABASE_URL` as your backend service. Then restart:

   ```bash
   docker compose up -d backend
   ```

3. **If the error persists**, run migrations from your laptop against the DB the app uses (so the URL in the error message). On the host where Docker runs, ensure the database’s **Trusted Sources** (firewall) allow your IP if you run from elsewhere:

   ```bash
   cd backend
   DATABASE_URL='postgresql+psycopg2://USER:PASSWORD@HOST:PORT/Compass?sslmode=require' alembic upgrade head
   ```

   Then restart the backend container.

### Non-Docker (e.g. DigitalOcean App Platform)

Run migrations from your machine with the **exact** `DATABASE_URL` from the app’s environment (same host, port, database name, `postgresql+psycopg2://`):

```bash
cd backend
DATABASE_URL='postgresql+psycopg2://USER:PASSWORD@HOST:PORT/Compass?sslmode=require' alembic upgrade head
```

Then redeploy or restart the app.

## Troubleshooting

### Database Connection Issues
- Verify connection string format: `postgresql+psycopg2://...`
- Check firewall rules in DigitalOcean (and that your IP is allowed if running migrations from your laptop)
- Verify SSL mode is `require`
- Ensure the **database name** in the URL is the one you use for the app (e.g. `Compass`). DigitalOcean clusters also have a built-in `defaultdb`; use one name consistently so migrations and the app hit the same database.
- **Migrations run but column still missing:** Your app is likely connecting to a **read replica** or pooler while migrations run on the primary. In DigitalOcean, use the **primary (writable)** connection string for `DATABASE_URL`, not the read-only or connection pooler endpoint. Otherwise the app will start but `/health` returns 503 and complaint endpoints may 500 until the replica has the schema.

### Rate Limiting Issues
- Check `RATE_LIMIT_ENABLED=true` in `.env`
- Adjust `RATE_LIMIT_PER_MINUTE` if needed

### Frontend Not Loading
- Verify `VITE_API_BASE` is set correctly in `frontend/.env`
- Check nginx logs: `docker compose logs frontend`

### Health Check Failing
- Check backend logs: `docker compose logs backend`
- Verify database connectivity
- Check environment variables are set correctly

