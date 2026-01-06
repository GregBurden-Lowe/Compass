# Web Application Stack Template

This document outlines the technology stack, architecture patterns, and reusable components used in this application. Use this as a template for creating new web applications with similar requirements.

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Reusable Patterns](#reusable-patterns)
5. [Configuration Management](#configuration-management)
6. [Security Patterns](#security-patterns)
7. [Deployment Patterns](#deployment-patterns)
8. [Development Workflow](#development-workflow)
9. [Testing Patterns](#testing-patterns)
10. [Using This Template](#using-this-template)

---

## Technology Stack

### Backend
- **Framework**: FastAPI 0.110.1
- **Language**: Python 3.11+
- **Database**: PostgreSQL 15+ (via SQLAlchemy 2.0)
- **ORM**: SQLAlchemy 2.0.30
- **Migrations**: Alembic 1.13.2
- **Authentication**: JWT (python-jose 3.3.0)
- **Password Hashing**: bcrypt 3.2.2 (via passlib 1.7.4)
- **Validation**: Pydantic 2.7.4
- **Rate Limiting**: slowapi 0.1.9
- **Server**: Uvicorn 0.29.0 (ASGI)
- **MFA**: pyotp 2.9.0

### Frontend
- **Framework**: React 18.2.0
- **Language**: TypeScript 5.3.3
- **Build Tool**: Vite 5.0.0
- **UI Library**: Material-UI (MUI) 5.15.21
- **Routing**: React Router DOM 6.23.1
- **HTTP Client**: Axios 1.7.2
- **Date Handling**: dayjs 1.11.10
- **QR Codes**: qrcode.react 3.1.0

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (Alpine)
- **SSL/TLS**: Let's Encrypt (Certbot)
- **Database**: PostgreSQL (managed or containerized)
- **File Storage**: Local filesystem (with Docker volumes)

### Development Tools
- **Testing**: pytest 8.2.2, httpx 0.27.0
- **Linting**: TypeScript ESLint
- **Version Control**: Git

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet Users                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Nginx (Port 80/443) │  ← Reverse Proxy / SSL Termination
         │   - SSL/TLS            │
         │   - Security Headers   │
         │   - Static Files        │
         └───────────┬─────────────┘
                     │
         ┌───────────┴─────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐      ┌──────────────────┐
│  Frontend       │      │  Backend         │
│  (React/Vite)   │      │  (FastAPI)       │
│  Port: 80       │      │  Port: 8000      │
│  Container      │      │  Container       │
└─────────────────┘      └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  PostgreSQL      │
                         │  (Managed/       │
                         │   Container)     │
                         └──────────────────┘
```

### Request Flow

1. **Client Request** → Nginx (port 80/443)
2. **Nginx Routes**:
   - `/api/*` → Backend container (port 8000)
   - `/attachments/*` → Backend static files
   - `/*` → Frontend container (port 80)
3. **Backend**:
   - Validates JWT token
   - Processes request
   - Returns JSON response
4. **Frontend**:
   - Serves static assets
   - Handles client-side routing (SPA)

### Key Architectural Decisions

1. **Separation of Concerns**: Frontend and backend are separate containers, allowing independent scaling and deployment.
2. **API-First**: Backend exposes RESTful API; frontend consumes it.
3. **JWT Authentication**: Stateless authentication for scalability.
4. **Reverse Proxy Pattern**: Nginx handles SSL, routing, and security headers at the edge.
5. **Database Abstraction**: SQLAlchemy ORM provides database independence.
6. **Environment-Based Configuration**: Settings loaded from environment variables.

---

## Project Structure

```
project-root/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── api/                # API route handlers
│   │   │   ├── auth.py         # Authentication endpoints
│   │   │   ├── deps.py         # Dependency injection (auth, DB)
│   │   │   ├── router.py       # Main API router
│   │   │   └── *.py            # Domain-specific routes
│   │   ├── core/               # Core configuration
│   │   │   ├── config.py       # Settings management (Pydantic)
│   │   │   ├── security.py    # JWT, password hashing
│   │   │   └── logging_config.py
│   │   ├── db/                 # Database configuration
│   │   │   ├── base.py         # Base model class
│   │   │   └── session.py      # Database session factory
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── base.py         # Base model
│   │   │   ├── user.py         # User model
│   │   │   └── *.py            # Domain models
│   │   ├── schemas/            # Pydantic schemas (request/response)
│   │   │   ├── auth.py
│   │   │   └── *.py
│   │   ├── services/           # Business logic layer
│   │   │   └── *.py            # Service functions
│   │   ├── utils/              # Utility functions
│   │   │   └── dates.py        # Date helpers
│   │   ├── tests/              # Test suite
│   │   │   ├── conftest.py     # Pytest fixtures
│   │   │   └── test_*.py
│   │   ├── main.py             # FastAPI app factory
│   │   └── seed/               # Seed data scripts
│   ├── alembic/                # Alembic migration config
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── requirements.txt
│   └── start.sh                # Container startup script
│
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── api/                # API client configuration
│   │   │   └── client.ts       # Axios instance, interceptors
│   │   ├── components/         # Reusable React components
│   │   ├── context/            # React Context providers
│   │   │   └── AuthContext.tsx # Authentication state
│   │   ├── pages/              # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   └── *.tsx
│   │   ├── types.ts            # TypeScript type definitions
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   ├── Dockerfile
│   ├── nginx.conf              # Frontend nginx config (SPA routing)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── nginx/                       # Reverse proxy configuration
│   └── default.conf            # Main nginx config (routing, SSL, headers)
│
├── certbot/                     # SSL certificate management
│   ├── deploy-hook.sh          # Post-renewal hook
│   └── www/                     # ACME challenge webroot
│
├── docker-compose.yml           # Production compose file
├── docker-compose.local.yml    # Local development overrides
├── .env                        # Environment variables (gitignored)
├── .gitignore
└── README.md
```

---

## Reusable Patterns

### 1. Backend Patterns

#### Authentication & Authorization

**JWT Token Management** (`backend/app/core/security.py`):
```python
from jose import JWTError, jwt
from passlib.context import CryptContext

# Password hashing with bcrypt
pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
```

**Dependency Injection for Auth** (`backend/app/api/deps.py`):
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_roles(allowed_roles: list[UserRole]):
    """Dependency factory for role-based access control"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker
```

**Usage in Routes**:
```python
@router.get("/protected")
def protected_route(
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.user]))
):
    return {"message": f"Hello {current_user.email}"}
```

#### Database Session Management

**Session Factory** (`backend/app/db/session.py`):
```python
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Pydantic Schemas Pattern

**Request/Response Models** (`backend/app/schemas/`):
```python
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True  # Pydantic v2: allows ORM model conversion
```

#### Service Layer Pattern

**Business Logic Separation** (`backend/app/services/`):
```python
from sqlalchemy.orm import Session
from app.models import User

def create_user(db: Session, user_data: UserCreate) -> User:
    """Service function for user creation logic"""
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

#### Error Handling

**Global Exception Handlers** (`backend/app/main.py`):
```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    logger.error(f"Unhandled exception: {type(exc).__name__}", exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )
```

### 2. Frontend Patterns

#### API Client Configuration

**Axios Instance with Interceptors** (`frontend/src/api/client.ts`):
```typescript
import axios from 'axios'

// Base URL configuration (dev vs prod)
const envBase = import.meta.env.VITE_API_BASE
const derivedBase = envBase || (
  import.meta.env.PROD ? '/api' : `${window.location.origin}:8000/api`
)

export const api = axios.create({ baseURL: derivedBase })

// Request interceptor: Add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle 401 (logout)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)
```

#### Authentication Context

**React Context for Auth State** (`frontend/src/context/AuthContext.tsx`):
```typescript
import { createContext, useContext, useState, useEffect } from 'react'

type AuthState = {
  token: string | null
  role: UserRole | null
  userId: string | null
  isReady: boolean
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    userId: null,
    isReady: false
  })

  useEffect(() => {
    // Validate token on mount
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then(res => setState({ ...res.data, isReady: true }))
        .catch(() => {
          localStorage.clear()
          setState({ token: null, role: null, userId: null, isReady: true })
        })
    } else {
      setState(prev => ({ ...prev, isReady: true }))
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

#### Protected Routes

**Route Guard Pattern** (`frontend/src/App.tsx`):
```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isReady } = useAuth()
  
  if (!isReady) return <div>Loading...</div>
  if (!token) return <Navigate to="/" replace />
  
  return <>{children}</>
}

// Usage
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

#### Form Handling Pattern

**Controlled Components with Validation**:
```typescript
const [form, setForm] = useState({ email: '', password: '' })
const [error, setError] = useState<string | null>(null)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError(null)
  try {
    await api.post('/auth/token', form)
    // Handle success
  } catch (err: any) {
    setError(err?.response?.data?.detail || 'Login failed')
  }
}
```

### 3. Infrastructure Patterns

#### Docker Compose Structure

**Production Config** (`docker-compose.yml`):
```yaml
services:
  backend:
    build: ./backend
    environment:
      DATABASE_URL: ${DATABASE_URL}  # From .env
      SECRET_KEY: ${SECRET_KEY}
    volumes:
      - attachments_data:/app/storage/attachments
    expose:
      - "8000"

  frontend:
    build: ./frontend
    expose:
      - "80"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
      - frontend

volumes:
  attachments_data:
```

**Local Overrides** (`docker-compose.local.yml`):
```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data_local:/var/lib/postgresql/data

  backend:
    environment:
      DATABASE_URL: postgresql+psycopg2://postgres:postgres@db:5432/myapp
    depends_on:
      - db
```

#### Nginx Configuration Pattern

**Reverse Proxy with SSL** (`nginx/default.conf`):
```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name example.com;
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl;
    server_name example.com;
    
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # API proxy
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend proxy (SPA)
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
    }
}
```

---

## Configuration Management

### Environment Variables Pattern

**Backend Settings** (`backend/app/core/config.py`):
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)
    
    # App config
    app_name: str = "My App"
    environment: str = "local"
    debug: bool = False
    
    # Security
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    access_token_expire_minutes: int = 480
    
    # Database
    database_url: str = Field(..., env="DATABASE_URL")
    
    # CORS
    cors_origins: str = "*"
    
    # Feature flags
    enable_api_docs: bool = False

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Frontend Environment Variables** (`.env` or `vite.config.ts`):
```typescript
// Vite exposes env vars with VITE_ prefix
const apiBase = import.meta.env.VITE_API_BASE || '/api'
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
```

### .env File Template

```bash
# Application
APP_NAME=My Application
ENVIRONMENT=production
DEBUG=false

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database
DATABASE_URL=postgresql+psycopg2://user:password@host:port/dbname

# CORS
CORS_ORIGINS=https://example.com

# Feature Flags
ENABLE_API_DOCS=true
DEMO_MODE=false
```

---

## Security Patterns

### 1. Authentication & Authorization

- **JWT Tokens**: Stateless authentication with configurable expiration
- **Password Hashing**: bcrypt with automatic upgrade from legacy hashes
- **Role-Based Access Control**: Dependency injection pattern for route protection
- **MFA Support**: TOTP-based multi-factor authentication (optional)

### 2. Security Headers

All security headers set at reverse proxy edge:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `Referrer-Policy`

See `SECURITY_HEADERS.md` for details.

### 3. Input Validation

- **Backend**: Pydantic schemas for request validation
- **Frontend**: TypeScript types + form validation
- **File Uploads**: Size limits, content type validation

### 4. Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/api/endpoint")
@limiter.limit("10/minute")
def endpoint(request: Request):
    pass
```

### 5. CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
)
```

---

## Deployment Patterns

### 1. Docker Build Patterns

**Backend Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run migrations and start
CMD ["sh", "start.sh"]
```

**Frontend Dockerfile**:
```dockerfile
# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 2. Database Migrations

**Alembic Pattern**:
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

**Startup Script** (`backend/start.sh`):
```bash
#!/bin/sh
set -e

# Wait for database
until pg_isready -h $DB_HOST; do
  sleep 1
done

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. SSL/TLS Setup

**Certbot Pattern**:
```bash
# Initial certificate
certbot certonly --webroot \
  --webroot-path=/path/to/certbot/www \
  -d example.com

# Auto-renewal (cron)
0 0 * * * certbot renew --quiet --deploy-hook /path/to/deploy-hook.sh
```

### 4. Production Checklist

- [ ] Environment variables configured in `.env`
- [ ] Database migrations applied
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Security headers configured in Nginx
- [ ] CORS origins restricted to production domain
- [ ] Rate limiting enabled
- [ ] API docs disabled in production (`ENABLE_API_DOCS=false`)
- [ ] Logging configured
- [ ] Backup strategy for database
- [ ] Monitoring/alerting setup

---

## Development Workflow

### Local Development

1. **Start Services**:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.local.yml up
   ```

2. **Backend Development** (optional):
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. **Frontend Development** (optional):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Git Workflow

1. **Feature Branch**:
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```

2. **Code Review & Merge**:
   - Create pull request
   - Review and approve
   - Merge to `main`

3. **Deploy to Production**:
   ```bash
   # On server
   git pull origin main
   docker compose up -d --build
   ```

### Database Migrations Workflow

1. **Create Migration**:
   ```bash
   cd backend
   alembic revision --autogenerate -m "add_user_table"
   ```

2. **Review Migration File** (`alembic/versions/xxx_add_user_table.py`)

3. **Test Locally**:
   ```bash
   alembic upgrade head
   ```

4. **Commit Migration**:
   ```bash
   git add alembic/versions/xxx_add_user_table.py
   git commit -m "Add user table migration"
   ```

5. **Apply in Production**:
   - Migration runs automatically on container startup (via `start.sh`)

---

## Testing Patterns

### Backend Testing

**Pytest Configuration** (`backend/app/tests/conftest.py`):
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import create_app
from app.db.base import Base
from app.db.session import get_db

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)
```

**Test Example**:
```python
def test_create_user(client):
    response = client.post("/api/users", json={
        "email": "test@example.com",
        "password": "password123",
        "full_name": "Test User"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
```

### Frontend Testing

**Component Testing** (example with React Testing Library):
```typescript
import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'

test('renders dashboard', () => {
  render(<Dashboard />)
  expect(screen.getByText('Dashboard')).toBeInTheDocument()
})
```

---

## Using This Template

### Step 1: Clone and Customize

1. **Copy the project structure** to a new directory
2. **Update project name** in:
   - `docker-compose.yml` (container names)
   - `backend/app/core/config.py` (`app_name`)
   - `frontend/package.json` (`name`)
   - `README.md`

### Step 2: Define Your Domain Models

1. **Create SQLAlchemy Models** (`backend/app/models/`):
   ```python
   from app.db.base import Base
   from sqlalchemy import Column, String, DateTime
   
   class MyModel(Base):
       __tablename__ = "my_table"
       id = Column(String, primary_key=True)
       name = Column(String, nullable=False)
   ```

2. **Create Pydantic Schemas** (`backend/app/schemas/`):
   ```python
   class MyModelCreate(BaseModel):
       name: str
   
   class MyModelOut(BaseModel):
       id: str
       name: str
   ```

3. **Create API Routes** (`backend/app/api/`):
   ```python
   from fastapi import APIRouter
   router = APIRouter(prefix="/my-models", tags=["my-models"])
   
   @router.post("", response_model=MyModelOut)
   def create_model(data: MyModelCreate, db: Session = Depends(get_db)):
       # Implementation
       pass
   ```

### Step 3: Customize Frontend

1. **Update TypeScript Types** (`frontend/src/types.ts`):
   ```typescript
   export interface MyModel {
     id: string
     name: string
   }
   ```

2. **Create Page Components** (`frontend/src/pages/`):
   ```typescript
   export default function MyModelList() {
     const [models, setModels] = useState<MyModel[]>([])
     // Implementation
   }
   ```

3. **Add Routes** (`frontend/src/App.tsx`):
   ```typescript
   <Route path="/my-models" element={<MyModelList />} />
   ```

### Step 4: Configure Environment

1. **Create `.env` file**:
   ```bash
   DATABASE_URL=postgresql+psycopg2://...
   SECRET_KEY=...
   CORS_ORIGINS=https://yourdomain.com
   ```

2. **Update Nginx config** (`nginx/default.conf`):
   - Change `server_name` to your domain
   - Update SSL certificate paths

### Step 5: Deploy

1. **Set up domain DNS** (A record pointing to server IP)
2. **Generate SSL certificate** (Certbot)
3. **Deploy**:
   ```bash
   git pull origin main
   docker compose up -d --build
   ```

### Customization Checklist

- [ ] Project name updated
- [ ] Domain models defined
- [ ] API endpoints created
- [ ] Frontend pages created
- [ ] Environment variables configured
- [ ] Nginx server_name updated
- [ ] SSL certificates installed
- [ ] Database migrations created
- [ ] Seed data (if needed)
- [ ] Security headers configured
- [ ] CORS origins restricted
- [ ] Tests written

---

## Key Takeaways

1. **Separation of Concerns**: Backend (API) and frontend (UI) are independent
2. **Configuration via Environment**: All settings via environment variables
3. **Security at the Edge**: Nginx handles SSL and security headers
4. **Database Migrations**: Alembic for version-controlled schema changes
5. **Docker Compose**: Consistent local and production environments
6. **JWT Authentication**: Stateless, scalable auth pattern
7. **Type Safety**: TypeScript (frontend) + Pydantic (backend)
8. **Service Layer**: Business logic separated from API routes

---

## Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/
- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **Docker Compose Documentation**: https://docs.docker.com/compose/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Alembic Documentation**: https://alembic.sqlalchemy.org/

---

## License

This template is provided as-is for use in your projects. Customize as needed for your specific requirements.

