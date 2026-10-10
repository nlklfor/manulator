from fastapi import APIRouter, Depends, UploadFile

from app.schemas.manuscript import UploadResponse
from app.services import storage
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/upload-manuscripts", tags=["manuscripts"])


@router.post("", response_model=UploadResponse, status_code=201)
def upload_manuscript(file: UploadFile, user_id: str = Depends(get_current_user_id)):
    return storage.save_upload(file, user_id)
