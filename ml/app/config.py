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

    # Hugging Face access token, needed for the private translation model
    hf_token: str | None = None

    # The model that classifies uploaded pages (CLASSIFIER_MODEL in ml/.env):
    # a Claude model, "gemini:<model>", or "local:<Hugging Face model>" (e.g. local:Qwen/Qwen3.5-4B),
    # a free model that runs inside this service
    # (see services/classification.py)
    classifier_model: str = "claude-haiku-5-5"

    # The correction model that fixes OCR errors in the transcribed text (CORRECTION_MODEL in ml/.env)
    correction_model: str = "RomanoAISPEC/byt5-small-latin-correction_v3"

    # Claude API key, needed for Claude models
    anthropic_api_key: str | None = None

    # Google Gemini API key, needed for Gemini models
    gemini_api_key: str | None = None

settings = Settings()
