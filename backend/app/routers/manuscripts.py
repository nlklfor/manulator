from uuid import UUID

from fastapi import APIRouter, Depends, Form, Path, UploadFile

from app.schemas.manuscript import (
    LineCorrection,
    LineCorrectionResponse,
    ManuscriptResponse,
    ManuscriptUpdate,
    ManuscriptUpdateResponse,
    PageClasses,
    UploadResponse,
)
from app.services import manuscript, storage
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/upload-manuscripts", tags=["manuscripts"])


@router.get("", response_model=list[ManuscriptResponse])
def list_manuscripts(user_id: str = Depends(get_current_user_id)):
    return storage.list_manuscripts(user_id)


@router.post("", response_model=UploadResponse, status_code=201)
def upload_manuscript(
    file: UploadFile,
    title: str = Form(),
    document_type: str = Form(),  # e.g. "Charter", "Register", "Letter"
    # Optional classes of the page, checked by the user in the upload form
    century: str | None = Form(None),
    script: str | None = Form(None),
    language: str | None = Form(None),
    region: str | None = Form(None),
    user_id: str = Depends(get_current_user_id),
):
    classes = PageClasses(
        document_type=document_type,
        century=century,
        script=script,
        language=language,
        region=region,
    )
    return storage.save_upload(file, user_id, title, classes)


# Suggests the classes of a page (century, script, language, region, document type)
# before it is uploaded. The upload form shows them so the user can check and edit them.
@router.post("/classify", response_model=PageClasses)
async def classify_manuscript(
    file: UploadFile, user_id: str = Depends(get_current_user_id)
):
    return await manuscript.classify_file(file)


@router.patch("/{manuscript_id}", response_model=ManuscriptUpdateResponse)
def update_manuscript(
    manuscript_id: UUID,
    update: ManuscriptUpdate,
    user_id: str = Depends(get_current_user_id),
):
    return storage.update_manuscript(str(manuscript_id), user_id, update)


# Saves the researcher's correction of one transcribed line.
# The corrected text replaces the model's text; the line keeps its index and position.
@router.patch(
    "/{manuscript_id}/lines/{line_index}", response_model=LineCorrectionResponse
)
def correct_line(
    manuscript_id: UUID,
    correction: LineCorrection,
    line_index: int = Path(ge=0),
    user_id: str = Depends(get_current_user_id),
):
    return manuscript.save_line_correction(
        str(manuscript_id), line_index, correction.text, user_id
    )


@router.delete("/{manuscript_id}", status_code=204)
def delete_manuscript(
    manuscript_id: UUID, user_id: str = Depends(get_current_user_id)
) -> None:
    storage.delete_manuscript(str(manuscript_id), user_id)
