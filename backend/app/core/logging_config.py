import logging
import sys
from app.core.config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    
    # Set log level based on environment
    if settings.debug or settings.environment == "local":
        log_level = logging.DEBUG
    elif settings.environment == "production":
        log_level = logging.WARNING
    else:
        log_level = logging.INFO
    
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    handler.setFormatter(formatter)
    root = logging.getLogger()
    root.setLevel(log_level)
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(log_level)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING if settings.environment == "production" else logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    if not root.handlers:
        root.addHandler(handler)

