from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
