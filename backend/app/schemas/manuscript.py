from datetime import datetime

from pydantic import BaseModel


# Classes of a page: suggested by the classifier, then checked and edited by the user.
# None = unknown (the classifier could not tell, or the user left it empty).
class PageClasses(BaseModel):
    document_type: str | None = None  # e.g. "Charter"
    century: str | None = None  # e.g. "13th century"
    script: str | None = None  # e.g. "Textualis"
    language: str | None = None  # e.g. "Latin"
    region: str | None = None  # e.g. "Upper Rhine"


# document_type (from PageClasses) is always filled for a saved manuscript
class UploadResponse(PageClasses):
    id: str  # manuscript id, used to delete the manuscript
    title: str
    filename: str
    content_type: str
    size: int
    url: str


# Body of PATCH: send only the fields that should change ("" clears a class)
class ManuscriptUpdate(PageClasses):
    title: str | None = None


class ManuscriptUpdateResponse(PageClasses):
    id: str
    title: str


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


class TranslationPlan(BaseModel):
    plan: str = "Translate"
    target_language: str = "English"
    type: str = "full"


class ManuscriptTranslationResponse(BaseModel):
    manuscript_id: str
    translated_lines: list[dict]  # list of dicts with "index" and "text"
    success: bool
    message: str | None


class LineCorrection(BaseModel):
    text: str


class LineCorrectionResponse(BaseModel):
    manuscript_id: str
    index: int  # same line index as in the transcription (reading order)
    text: str
    status: str


class ManuscriptResponse(UploadResponse):
    status: str  # status of the first file, e.g. "uploaded"
    created_at: datetime
    # Filled once the page is transcribed, otherwise None
    transcription: list[dict] | None = None  # lines: index, text, bbox, ...
    overlay_url: str | None = None  # page with the lines drawn on it, valid 1 day
