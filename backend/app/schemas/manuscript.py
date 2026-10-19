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
    manuscript_id: str
    user_id: str
    steps: list[str]|None
    input: str
    options: list[str]|None


class ManuscriptTranscriptResponse(BaseModel):
    manuscript_id: str
    overlay: str  # JPEG as a data URL, usable directly as <img src>
    url: str  # temporary link to the file, valid for 1 day
