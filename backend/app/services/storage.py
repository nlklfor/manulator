import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile
from storage3.utils import StorageException

from app.config import settings
from app.schemas.manuscript import UploadResponse
from app.services.bucket import upload_file

logger = logging.getLogger(__name__)


def save_upload(file: UploadFile, user_id: str) -> UploadResponse:
    if file.content_type not in settings.allowed_content_types:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    if file.size > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit")

    # No compression: it can blur handwriting and hurt text recognition
    try:
        path, url = upload_file(
            file.file.read(), file.content_type, user_id, "manuscripts"
        )
    except StorageException as error:
        logger.warning("Supabase upload failed: %s", error)
        raise HTTPException(
            502, "Could not save the file. Please try again."
        ) from error

    return UploadResponse(
        id=path,
        filename=Path(file.filename).name,
        content_type=file.content_type,
        size=file.size,
        url=url,
    )
