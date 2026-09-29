from fastapi import APIRouter, UploadFile

from app.schemas.manuscript import UploadResponse
from app.services import storage

router = APIRouter(prefix="/upload-manuscripts", tags=["manuscripts"])


@router.post("", response_model=UploadResponse, status_code=201)
def upload_manuscript(file: UploadFile):
    return storage.save_upload(file)
