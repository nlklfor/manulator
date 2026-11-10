from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # .env overrides .env; both are git-ignored
    model_config = SettingsConfigDict(
        env_file=(
            Path(__file__).parent.parent / ".env"
        ),
        extra="ignore",
    )

    cors_origins: list[str] = ["http://localhost:8000"]
    # Base URL of the frontend application, used for redirect links in auth emails
    frontend_url: str = "http://localhost:3000"

    # address of the ML service (ml/), which runs the models
    ml_service_url: str = "http://127.0.0.1:8001"

    max_upload_mb: int = 20
    allowed_content_types: list[str] = ["image/jpeg", "image/png"]

    # Hugging Face access token, needed for the private translation model
    hf_token: str | None = None

settings = Settings()
