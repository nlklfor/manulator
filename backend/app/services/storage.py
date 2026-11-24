import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile
from postgrest import APIError
from storage3.utils import StorageException

from app.config import settings
from app.schemas.manuscript import (
    ManuscriptResponse,
    ManuscriptUpdate,
    ManuscriptUpdateResponse,
    PageClasses,
    UploadResponse,
)
from app.services.bucket import delete_file, get_file_urls, upload_file
from app.services.database import get_admin_client
from app.services.images import PageError, content_type_of, is_supported, to_page_image
from app.services.sharing import get_usernames

logger = logging.getLogger(__name__)


# The same rules apply when a manuscript is uploaded and when it is edited.
# Both return the trimmed text.
def check_title(title: str) -> str:
    title = title.strip()
    if not 1 <= len(title) <= 200:
        raise HTTPException(422, "Title must be 1 to 200 characters.")
    return title


def check_document_type(document_type: str) -> str:
    document_type = document_type.strip()
    if not 1 <= len(document_type) <= 50:
        raise HTTPException(422, "Document type must be 1 to 50 characters.")
    return document_type


# The classes of a page: document type is required (check_document_type),
# century, script, language and region are optional.
# Returns the trimmed text, or None when it is empty.
CLASS_FIELDS = ("century", "script", "language", "region")


def check_class(name: str, value: str | None) -> str | None:
    value = (value or "").strip()
    if len(value) > 100:
        raise HTTPException(422, f"{name.capitalize()} must be at most 100 characters.")
    return value or None


# Uploads the file, then saves a manuscript row and its file row.
def save_upload(
    file: UploadFile, user_id: str, title: str, classes: PageClasses
) -> UploadResponse:
    title = check_title(title)
    document_type = check_document_type(classes.document_type or "")
    class_values = {
        name: check_class(name, getattr(classes, name)) for name in CLASS_FIELDS
    }

    content_type = content_type_of(file.content_type, file.filename)
    if not is_supported(content_type):
        raise HTTPException(415, f"Unsupported file type: {content_type}")

    # Measure the bytes ourselves: file.size can be None.
    # Reading 1 byte past the limit is enough to know the file is too large.
    limit = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    size = len(data)
    if size > limit:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit")

    filename = Path(file.filename or "").name[:255] or "upload"

    # Only the first page of a PDF is used, and images browsers cannot show (e.g. TIFF)
    # are converted. Both are stored as PNG, so the preview and the recognition models
    # can work with them like with any other scan.
    try:
        data, stored_type = to_page_image(data, content_type)
    except PageError as error:
        logger.warning("Converting %s failed: %s", content_type, error.__cause__)
        raise HTTPException(422, str(error)) from error
    if stored_type != content_type:
        content_type, size = stored_type, len(data)
        filename = Path(filename).stem + ".png"

    # No compression: it can blur handwriting and hurt text recognition
    try:
        path, url = upload_file(data, content_type, user_id, "manuscripts")
    except StorageException as error:
        logger.warning("Supabase upload failed: %s", error)
        raise HTTPException(
            502, "Could not save the file. Please try again."
        ) from error

    db = get_admin_client()
    manuscript = None
    try:
        # The admin client ignores RLS and auth.uid(), so owner_id is set here
        manuscript = (
            db.table("manuscripts")
            .insert(
                {
                    "owner_id": user_id,
                    "title": title,
                    "document_type": document_type,
                    **class_values,
                }
            )
            .execute()
            .data[0]
        )
        # status is left out: the database sets it to "uploaded"
        db.table("manuscript_files").insert(
            {
                "manuscript_id": manuscript["id"],
                "owner_id": user_id,
                "file_name": filename,
                "storage_path": path,
                "content_type": content_type,
                "size_bytes": size,
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
            502, "Could not save the manuscript. Please try again."
        ) from error

    return UploadResponse(
        id=manuscript["id"],
        title=title,
        document_type=document_type,
        **class_values,
        filename=filename,
        content_type=content_type,
        size=size,
        url=url,
    )


# Returns the user's manuscripts, newest first, each with its first file.
def list_manuscripts(user_id: str) -> list[ManuscriptResponse]:
    db = get_admin_client()
    try:
        # The admin client ignores RLS, so the owner must be checked here
        manuscripts = (
            db.table("manuscripts")
            .select(
                "id, title, document_type, created_at, shared_by, "
                "century, script, language, region"
            )
            .eq("owner_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )
        files = (
            db.table("manuscript_files")
            .select(
                "manuscript_id, file_name, storage_path, content_type, "
                "size_bytes, position, status, transcription, overlay_path, "
                "translation, summary"
            )
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

    # Usernames of the people who shared a copy with this user, in one request.
    # Without them the library still works, so a failure only hides the badge.
    sharers = list({m["shared_by"] for m in manuscripts if m.get("shared_by")})
    try:
        usernames = get_usernames(sharers)
    except APIError as error:
        logger.warning("Could not load the usernames of sharers: %s", error)
        usernames = {}

    first_files: dict[str, dict] = {}
    for row in files:
        first_files.setdefault(row["manuscript_id"], row)

    # One request for all links: the pages and their overlays
    paths = [row["storage_path"] for row in first_files.values()]
    paths += [
        row["overlay_path"] for row in first_files.values() if row.get("overlay_path")
    ]
    try:
        urls = get_file_urls(paths)
    except StorageException as error:
        logger.warning("Could not create file links: %s", error)
        urls = {}

    return [
        ManuscriptResponse(
            id=manuscript["id"],
            title=manuscript["title"],
            document_type=manuscript["document_type"],
            **{name: manuscript.get(name) for name in CLASS_FIELDS},
            created_at=manuscript["created_at"],
            filename=file["file_name"],
            content_type=file["content_type"],
            size=file["size_bytes"],
            status=file["status"],
            url=urls.get(file["storage_path"], ""),
            transcription=file.get("transcription"),
            overlay_url=urls.get(file.get("overlay_path") or ""),
            translation=file.get("translation"),
            summary=file.get("summary"),
            shared_by_username=usernames.get(manuscript.get("shared_by") or ""),
        )
        for manuscript in manuscripts
        if (file := first_files.get(manuscript["id"]))
    ]


# Changes the title, the document type and/or the classes of a manuscript.
# Fields that are None stay as they are; an empty class ("") is cleared.
def update_manuscript(
    manuscript_id: str, user_id: str, update: ManuscriptUpdate
) -> ManuscriptUpdateResponse:
    changes = {}
    if update.title is not None:
        changes["title"] = check_title(update.title)
    if update.document_type is not None:
        changes["document_type"] = check_document_type(update.document_type)
    for name in CLASS_FIELDS:
        if getattr(update, name) is not None:
            changes[name] = check_class(name, getattr(update, name))
    if not changes:
        raise HTTPException(422, "Send at least one field to change.")

    db = get_admin_client()
    try:
        # The admin client ignores RLS, so the owner must be checked here
        result = (
            db.table("manuscripts")
            .update(changes)
            .eq("id", manuscript_id)
            .eq("owner_id", user_id)
            .execute()
        )
    except APIError as error:
        logger.warning("Supabase update failed: %s", error)
        raise HTTPException(
            502, "Could not save the changes. Please try again."
        ) from error

    # No row changed: the manuscript does not exist or belongs to someone else
    if not result.data:
        raise HTTPException(404, "Manuscript not found")

    row = result.data[0]
    return ManuscriptUpdateResponse(
        id=row["id"],
        title=row["title"],
        document_type=row["document_type"],
        **{name: row.get(name) for name in CLASS_FIELDS},
    )


# Deletes a manuscript, its file rows (foreign key cascade) and its files in Storage.
def delete_manuscript(manuscript_id: str, user_id: str) -> None:
    db = get_admin_client()
    try:
        # Read the paths first: the cascade removes the file rows with the manuscript
        files = (
            db.table("manuscript_files")
            .select("storage_path, overlay_path")
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
    paths = [row["storage_path"] for row in files.data]
    paths += [row["overlay_path"] for row in files.data if row.get("overlay_path")]
    for path in paths:
        try:
            if not delete_file(path):
                logger.warning("File not found in Storage: %s", path)
        except StorageException as error:
            logger.warning("Could not delete file %s: %s", path, error)
