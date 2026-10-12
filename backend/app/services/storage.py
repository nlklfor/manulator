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


# delete a manuscript file from Supabase storage.
def delete_manuscript(manuscript_id: str, user_id: str) -> bool:
    if not manuscript_id.startswith(f"{user_id}/manuscripts/"):
        raise HTTPException(404, "Manuscript not found or you don't have "
                                 "permission to delete it")
    supabase_client = get_admin_client()
    try:
        # first delete the file from the database, then delete the file from the bucket
        files = (
            supabase_client.table("manuscript_files")
            .select("storage_path")
            .eq("owner_id", user_id)
            .execute()
        )
        # Find the manuscript file with the given manuscript_id
        manuscript = (
            supabase_client.table("manuscripts")
            .delete()
            .eq("id", manuscript_id)
            .eq("owner_id", user_id)
            .execute()
        )
    except APIError as error:
        logger.warning("Supabase delete failed: %s", error)
        raise HTTPException(502, "Could not delete the manuscript. Please try again.") \
            from error

    if not manuscript.data:
        raise HTTPException(404, "Manuscript not found or you don't have "
                                 "permission to delete it")

    paths = [row["storage_path"] for row in files.data]
    if paths:
        try:
            if not delete_file(paths[0]):
                logger.warning("Supabase storage delete failed for path: %s", paths)
        except StorageException as error:
            logger.warning("Supabase storage delete failed: %s", error)
