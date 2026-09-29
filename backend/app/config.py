from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:3000"]

    upload_dir: Path = Path("uploads")
    max_upload_mb: int = 20
    allowed_content_types: list[str] = ["image/jpeg", "image/png", "application/pdf"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
