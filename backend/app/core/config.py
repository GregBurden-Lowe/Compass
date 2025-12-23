from pydantic import BaseSettings, Field
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Complaints Management"
    debug: bool = False
    secret_key: str = Field("changeme", env="SECRET_KEY")
    access_token_expire_minutes: int = 60 * 8
    algorithm: str = "HS256"

    database_url: str = Field(
        "postgresql+psycopg2://postgres:postgres@db:5432/complaints",
        env="DATABASE_URL",
    )

    demo_mode: bool = Field(False, env="DEMO_MODE")
    ack_sla_days: int = Field(2, env="ACK_SLA_DAYS")
    final_response_sla_weeks: int = Field(8, env="FINAL_RESPONSE_SLA_WEEKS")

    cors_origins: str = Field("*", env="CORS_ORIGINS")
    environment: str = Field("local", env="ENVIRONMENT")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

