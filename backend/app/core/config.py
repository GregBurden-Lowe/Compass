from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import secrets


class Settings(BaseSettings):
    app_name: str = "Complaints Management"
    debug: bool = Field(False, env="DEBUG")
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), env="SECRET_KEY")
    access_token_expire_minutes: int = Field(60 * 8, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    algorithm: str = "HS256"

    database_url: str = Field(
        "postgresql+psycopg2://postgres:postgres@db:5432/complaints",
        env="DATABASE_URL",
    )
    # Note: For DigitalOcean, use format:
    # postgresql+psycopg2://doadmin:PASSWORD@HOST:25060/defaultdb?sslmode=require

    demo_mode: bool = Field(False, env="DEMO_MODE")
    ack_sla_days: int = Field(2, env="ACK_SLA_DAYS")
    final_response_sla_weeks: int = Field(8, env="FINAL_RESPONSE_SLA_WEEKS")

    cors_origins: str = Field("*", env="CORS_ORIGINS")
    environment: str = Field("local", env="ENVIRONMENT")
    
    # Rate limiting
    rate_limit_enabled: bool = Field(True, env="RATE_LIMIT_ENABLED")
    rate_limit_per_minute: int = Field(60, env="RATE_LIMIT_PER_MINUTE")
    
    # File upload limits
    max_upload_size_mb: int = Field(10, env="MAX_UPLOAD_SIZE_MB")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

