import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile
from postgrest import APIError
from storage3.utils import StorageException

from app.config import settings
from app.schemas.manuscript import Manuscript, ManuscriptFile, UploadResponse
from app.services.bucket import delete_file, get_file_url, upload_file
from app.services.database import get_admin_client

logger = logging.getLogger(__name__)


def save_upload(file: UploadFile, user_id: str) -> UploadResponse:
    if file.content_type not in settings.allowed_content_types:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    if file.size > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit")

    filename = Path(file.filename or "").name[:255] or "Untitled"

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

    # One manuscript per upload, titled after the file, with the file as page 1
    title = Path(filename).stem.strip()[:200] or "Untitled"
    db = get_admin_client()
    manuscript = None
    try:
        manuscript = (
            db.table("manuscripts")
            .insert({"owner_id": user_id, "title": title})
            .execute()
            .data[0]
        )
        db.table("manuscript_files").insert(
            {
                "manuscript_id": manuscript["id"],
                "owner_id": user_id,
                "file_name": filename,
                "storage_path": path,
                "content_type": file.content_type,
                "size_bytes": file.size,
                "position": 1,
            }
        ).execute()
    except APIError as error:
        logger.warning("Saving manuscript rows failed: %s", error)
        # Undo, so no half-saved manuscript or orphan file is left behind
        if manuscript:
            db.table("manuscripts").delete().eq("id", manuscript["id"]).execute()
        delete_file(path)
        raise HTTPException(
            502, "Could not save the file. Please try again."
        ) from error

    return UploadResponse(
        id=manuscript["id"],
        filename=filename,
        content_type=file.content_type,
        size=file.size,
        url=url,
    )


# All manuscripts of the user, newest first, each with its files and fresh links.
def list_manuscripts(user_id: str) -> list[Manuscript]:
    db = get_admin_client()
    try:
        # The admin client ignores RLS, so filter by owner here
        manuscripts = (
            db.table("manuscripts")
            .select("id, title, created_at")
            .eq("owner_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )
        files = (
            db.table("manuscript_files")
            .select("manuscript_id, file_name, content_type, size_bytes, storage_path")
            .eq("owner_id", user_id)
            .order("position")
            .execute()
            .data
        )
    except APIError as error:
        logger.warning("Loading manuscripts failed: %s", error)
        raise HTTPException(
            502, "Could not load your manuscripts. Please try again."
        ) from error

    # ponytail: one signed-link request per file; batch with create_signed_urls
    # if libraries get large
    return [
        Manuscript(
            id=m["id"],
            title=m["title"],
            created_at=m["created_at"],
            files=[
                ManuscriptFile(
                    file_name=f["file_name"],
                    content_type=f["content_type"],
                    size=f["size_bytes"],
                    url=get_file_url(f["storage_path"]),
                )
                for f in files
                if f["manuscript_id"] == m["id"]
            ],
        )
        for m in manuscripts
    ]


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
