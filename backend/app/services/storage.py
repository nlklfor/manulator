import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile
from postgrest import APIError
from storage3.utils import StorageException

from app.config import settings
from app.schemas.manuscript import UploadResponse
from app.services.bucket import delete_file, upload_file
from app.services.database import get_admin_client

logger = logging.getLogger(__name__)


def save_upload(file: UploadFile, user_id: str) -> UploadResponse:
    content_type = file.content_type
    if not content_type or content_type not in settings.allowed_content_types:
        raise HTTPException(415, f"Unsupported file type: {content_type}")

    data = file.file.read()
    size = len(data)

    if size > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit")

    # No compression: it can blur handwriting and hurt text recognition
    try:
        path, url = upload_file(data, content_type, user_id, "manuscripts")
    except StorageException as error:
        logger.warning("Supabase upload failed: %s", error)
        raise HTTPException(
            502, "Could not save the file. Please try again."
        ) from error

    return UploadResponse(
        id=path,
        filename=Path(file.filename or "upload").name,
        content_type=content_type,
        size=size,
        url=url,
    )


# Deletes a manuscript, its file rows (foreign key cascade) and its files in Storage.
def delete_manuscript(manuscript_id: str, user_id: str) -> None:
    db = get_admin_client()
    try:
        # Read the paths first: the cascade removes the file rows with the manuscript
        files = (
            db.table("manuscript_files")
            .select("storage_path")
            .eq("manuscript_id", manuscript_id)
            .eq("owner_id", user_id)
            .execute()
        )
        # The admin client ignores RLS, so the owner must be checked here
        manuscript = (
            db.table("manuscripts")
            .delete()
            .eq("id", manuscript_id)
            .eq("owner_id", user_id)
            .execute()
        )
    except APIError as error:
        logger.warning("Supabase delete failed: %s", error)
        raise HTTPException(
            502, "Could not delete the manuscript. Please try again."
        ) from error

    if not manuscript.data:
        raise HTTPException(404, "Manuscript not found")

    # Leftover files are harmless, so Storage problems do not fail the request
    for row in files.data:
        path = row["storage_path"]
        try:
            if not delete_file(path):
                logger.warning("File not found in Storage: %s", path)
        except StorageException as error:
            logger.warning("Could not delete file %s: %s", path, error)
