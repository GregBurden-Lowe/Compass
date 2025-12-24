from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Connection pooling for managed databases (DigitalOcean)
# pool_pre_ping: Verify connections before using
# pool_recycle: Recycle connections after 1 hour to avoid stale connections
engine = create_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    pool_recycle=3600,
    # Adjust pool size based on your database plan
    # DigitalOcean basic plans typically allow 25 connections
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

