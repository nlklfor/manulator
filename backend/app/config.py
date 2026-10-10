from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:3000"]
    # Base URL of the frontend application, used for redirect links in auth emails
    frontend_url: str = "http://localhost:3000"

    # Set in backend/.env (SUPABASE_URL, SUPABASE_SECRET_KEY), never commit real values
    supabase_url: str = ""
    # Supabase secret key, bypasses RLS so it must stay on the backend
    supabase_secret_key: str = ""
    # Supabase Storage buckets (create both in the dashboard)
    storage_bucket: str = "uploads"  # private: manuscripts, signed 1-hour links
    public_bucket: str = "avatars"  # public: avatars, permanent links
    # address of the frontend, used to build the link in the reset password email
    frontend_url: str = "http://localhost:3000"

    max_upload_mb: int = 20
    allowed_content_types: list[str] = ["image/jpeg", "image/png", "application/pdf"]

    # Load the values above from backend/.env (from any folder the server starts in)
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent / ".env", extra="ignore"
    )


settings = Settings()
