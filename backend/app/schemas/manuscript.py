from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: str  # manuscript id, used to delete the manuscript
    title: str
    document_type: str
    filename: str
    content_type: str
    size: int
    url: str  # temporary link to the file, valid for 1 day
