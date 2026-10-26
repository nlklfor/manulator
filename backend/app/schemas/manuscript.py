from datetime import datetime

from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: str  # manuscript id, used to delete the manuscript
    title: str
    document_type: str
    filename: str
    content_type: str
    size: int
    url: str


class ManuscriptProcessPlan(BaseModel):
    steps: list[str] | None
    plan: str
    options: dict[str, str] | None


class ManuscriptTranscriptResponse(BaseModel):
    manuscript_id: str
    overlay: str  # JPEG as a data URL, usable directly as <img src>
    data: dict  # results per pipeline step, e.g. {"Detect Lines": {"lines": [...]}}
    success: bool
    message: str | None


class ManuscriptResponse(UploadResponse):
    status: str  # status of the first file, e.g. "uploaded"
    created_at: datetime
    # Filled once the page is transcribed, otherwise None
    transcription: list[dict] | None = None  # lines: index, text, bbox, ...
    overlay_url: str | None = None  # page with the lines drawn on it, valid 1 day
