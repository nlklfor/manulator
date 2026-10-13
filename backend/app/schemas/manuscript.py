from datetime import datetime

from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: str  # manuscript id, use it to delete the manuscript
    filename: str
    content_type: str
    size: int
    url: str  # temporary link, valid for 1 hour


class ManuscriptFile(BaseModel):
    file_name: str
    content_type: str
    size: int
    url: str  # temporary link, valid for 1 hour


class Manuscript(BaseModel):
    id: str
    title: str
    created_at: datetime
    files: list[ManuscriptFile]
