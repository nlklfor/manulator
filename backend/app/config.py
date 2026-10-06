from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:3000"]
    # Base URL of the frontend application, used for constructing redirect URLs after authentication
    frontend_url: str = "http://localhost:3000"

    # Supabase project URL, e.g. https://your-project-ref.supabase.co
    supabase_url: str = ""
    # Supabase secret key, bypasses RLS so it must stay on the backend
    supabase_secret_key: str = ""

    upload_dir: Path = Path("uploads")
    max_upload_mb: int = 20
    allowed_content_types: list[str] = ["image/jpeg", "image/png", "application/pdf"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
