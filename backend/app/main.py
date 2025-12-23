from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.db import base  # noqa: F401
from app.db.session import engine


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    app = FastAPI(title=settings.app_name, debug=settings.debug)
    allow_origins = settings.cors_origins.split(",") if settings.cors_origins else ["*"]
    if allow_origins == ["*"]:
        allow_origins = ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.mount("/attachments", StaticFiles(directory="storage/attachments"), name="attachments")
    app.include_router(api_router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()

