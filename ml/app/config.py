from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:8000"]
    # Base URL of the frontend application, used for redirect links in auth emails
    frontend_url: str = "http://localhost:3000"

    # address of the ML service (ml/), which runs the models
    ml_service_url: str = "http://127.0.0.1:8001"

    max_upload_mb: int = 20
    allowed_content_types: list[str] = ["image/jpeg", "image/png"]

settings = Settings()
