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

## Troubleshooting

### Database Connection Issues
- Verify connection string format: `postgresql+psycopg2://...`
- Check firewall rules in DigitalOcean
- Verify SSL mode is `require`

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

