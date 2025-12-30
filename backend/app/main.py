from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.db import base  # noqa: F401
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        docs_url="/docs" if settings.enable_api_docs else None,
        redoc_url="/redoc" if settings.enable_api_docs else None,
    )
    
    # Add rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Apply rate limiting middleware
    if settings.rate_limit_enabled:
        from slowapi.middleware import SlowAPIMiddleware
        # Set default rate limit
        limiter._default_limits = [f"{settings.rate_limit_per_minute}/minute"]
        app.add_middleware(SlowAPIMiddleware)
    
    # CORS configuration
    allow_origins = settings.cors_origins.split(",") if settings.cors_origins else ["*"]
    # In production, don't allow wildcard with credentials
    if settings.environment == "production" and "*" in allow_origins:
        logger.warning("CORS_ORIGINS is set to '*' in production. This is insecure with credentials enabled.")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled exception: {type(exc).__name__}",
            exc_info=exc,
            extra={
                "path": request.url.path,
                "method": request.method,
                "client": get_remote_address(request),
            }
        )
        if settings.debug:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": str(exc),
                    "type": type(exc).__name__,
                }
            )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            f"Validation error: {exc.errors()}",
            extra={"path": request.url.path, "method": request.method}
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    
    app.mount("/attachments", StaticFiles(directory="storage/attachments"), name="attachments")
    app.include_router(api_router)

    @app.get("/health")
    async def health():
        """Enhanced health check with database connectivity"""
        from sqlalchemy import text
        db_status = "unknown"
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            db_status = "connected"
        except SQLAlchemyError as e:
            logger.error(f"Database health check failed: {e}")
            db_status = "disconnected"
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unhealthy",
                    "database": db_status,
                }
            )
        except Exception as e:
            logger.error(f"Unexpected error in health check: {e}")
            db_status = "error"
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unhealthy",
                    "database": db_status,
                }
            )
        
        return {
            "status": "healthy",
            "database": db_status,
            "environment": settings.environment,
        }

    return app


app = create_app()

