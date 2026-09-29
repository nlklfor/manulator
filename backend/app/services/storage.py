import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.schemas.manuscript import UploadResponse

EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "application/pdf": ".pdf"}


def save_upload(file: UploadFile) -> UploadResponse:
    if file.content_type not in settings.allowed_content_types:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    if file.size > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit")

    file_id = uuid.uuid4().hex  # Save file with a unique Id
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    path = settings.upload_dir / f"{file_id}{EXTENSIONS[file.content_type]}"

    with path.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    return UploadResponse(
        id=file_id,
        filename=Path(file.filename).name,
        content_type=file.content_type,
        size=file.size,
    )
