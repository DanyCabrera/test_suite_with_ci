from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://barberia:barberia@localhost:5432/barberia"
    jwt_secret: str = "cambia-este-secreto"
    jwt_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    seed_on_startup: bool = True
    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "admin-dev-pass"
    seed_barber_password: str = "barber-dev-pass"
    seed_barber1_email: str = "barbero1@example.com"
    seed_barber1_name: str = "Mateo Ruiz"
    seed_barber2_email: str = "barbero2@example.com"
    seed_barber2_name: str = "Leo Vargas"
    timezone: str = "America/Mexico_City"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
