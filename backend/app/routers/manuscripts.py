from uuid import UUID

from fastapi import APIRouter, Depends, Form, UploadFile

<<<<<<< HEAD
from app.schemas.manuscript import (
    UploadResponse,
)
=======
from app.schemas.manuscript import ManuscriptResponse, UploadResponse
>>>>>>> c678f82 (feat: add get endpoint for manuscripts)
from app.services import storage
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/upload-manuscripts", tags=["manuscripts"])


@router.get("", response_model=list[ManuscriptResponse])
def list_manuscripts(user_id: str = Depends(get_current_user_id)):
    return storage.list_manuscripts(user_id)


@router.post("", response_model=UploadResponse, status_code=201)
def upload_manuscript(
    file: UploadFile,
    title: str = Form(),
    document_type: str = Form(),  # e.g. "Religious", "Political", "Historical"
    user_id: str = Depends(get_current_user_id),
):
    return storage.save_upload(file, user_id, title, document_type)


@router.delete("/{manuscript_id}", status_code=204)
def delete_manuscript(
    manuscript_id: UUID, user_id: str = Depends(get_current_user_id)
) -> None:
    storage.delete_manuscript(str(manuscript_id), user_id)
