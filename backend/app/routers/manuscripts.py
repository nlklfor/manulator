from uuid import UUID

from fastapi import APIRouter, Depends, Form, UploadFile

from app.schemas.manuscript import (
    ManuscriptProcessPlan,
    ManuscriptTranscriptResponse,
    UploadResponse,
)
from app.services import manuscript, storage
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/upload-manuscripts", tags=["manuscripts"])


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


@router.put("/{manuscript_id}", response_model=ManuscriptTranscriptResponse)
def process_manuscript(
    manuscript_id: UUID,
    plan: ManuscriptProcessPlan,
    user_id: str = Depends(get_current_user_id),
):
    plan.manuscript_id = str(manuscript_id)
    return manuscript.process_manuscript(plan, user_id)
