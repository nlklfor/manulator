import hashlib
import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import PurePosixPath

from fastapi import HTTPException
from postgrest import APIError
from storage3.utils import StorageException

from app.config import settings
from app.schemas.auth import normalize_username
from app.schemas.sharing import (
    AcceptResponse,
    ShareLink,
    ShareLinkCreated,
    ShareLinkPreview,
    ShareResponse,
)
from app.services.bucket import copy_file, delete_file
from app.services.database import get_admin_client

logger = logging.getLogger(__name__)

LINK_VALID_FOR = timedelta(hours=24)

# The same message for an unknown username and a manuscript you don't own,
# so nobody can find out which usernames exist by trying them
NOT_FOUND = "Manuscript or user not found."
# The same message for expired, revoked, deleted and unknown links
LINK_NOT_FOUND = "This link is no longer available."
TRANSCRIBING = "Wait until transcription has finished."
COPY_FAILED = "Could not share the manuscript. Please try again."
READ_FAILED = "Could not read the share data. Please try again."

# Columns of a page that the copy keeps as they are
COPIED_FILE_COLUMNS = (
    "file_name",
    "content_type",
    "size_bytes",
    "position",
    "status",
    "transcription",
)


def now() -> datetime:
    return datetime.now(UTC)


# Only the SHA-256 hash of a link token is stored, never the token itself:
# someone who can read the table still cannot open the links.
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# Returns the id of the user with this username, or None (exact match only,
# so nobody can list or search all users).
def find_user_id(username: str) -> str | None:
    rows = (
        get_admin_client()
        .table("profiles")
        .select("id")
        .eq("username", normalize_username(username))
        .execute()
        .data
    )
    return rows[0]["id"] if rows else None


# Returns {user_id: username} for the given ids, in one request.
def get_usernames(user_ids: list[str]) -> dict[str, str | None]:
    if not user_ids:
        return {}
    rows = (
        get_admin_client()
        .table("profiles")
        .select("id, username")
        .in_("id", user_ids)
        .execute()
        .data
    )
    return {row["id"]: row.get("username") for row in rows}


# Copies a manuscript, all its pages, their transcription and overlays into the
# recipient's library and returns the id of the new manuscript.
# The copy is independent: later changes or deletes never affect the other one.
# If any step fails, everything already copied is removed again.
def copy_manuscript(source_id: str, owner_id: str, recipient_id: str) -> str:
    db = get_admin_client()
    try:
        # The admin client ignores RLS, so the owner must be checked here
        source = (
            db.table("manuscripts")
            .select("id, title, document_type")
            .eq("id", source_id)
            .eq("owner_id", owner_id)
            .execute()
            .data
        )
        if not source:
            raise HTTPException(404, NOT_FOUND)
        files = (
            db.table("manuscript_files")
            .select(
                "file_name, storage_path, content_type, size_bytes, position, "
                "status, transcription, overlay_path"
            )
            .eq("manuscript_id", source_id)
            .eq("owner_id", owner_id)
            .order("position")
            .execute()
            .data
        )
    except APIError as error:
        logger.warning("Reading the manuscript to share failed: %s", error)
        raise HTTPException(502, COPY_FAILED) from error

    # A page that is being transcribed would be copied without its result
    if any(page["status"] == "transcribing" for page in files):
        raise HTTPException(409, TRANSCRIBING)

    copied_paths: list[str] = []
    new_id = None
    try:
        # owner_id is set explicitly: the admin client has no auth.uid()
        new_id = (
            db.table("manuscripts")
            .insert(
                {
                    "owner_id": recipient_id,
                    "title": source[0]["title"],
                    "document_type": source[0]["document_type"],
                    "shared_by": owner_id,
                    "shared_at": now().isoformat(),
                }
            )
            .execute()
            .data[0]["id"]
        )

        for page in files:
            extension = PurePosixPath(page["storage_path"]).suffix
            page_path = f"{recipient_id}/{new_id}/{uuid.uuid4().hex}{extension}"
            copy_file(page["storage_path"], page_path)
            copied_paths.append(page_path)

            overlay_path = None
            if page.get("overlay_path"):
                overlay_path = f"{recipient_id}/overlays/{uuid.uuid4().hex}.jpg"
                copy_file(page["overlay_path"], overlay_path)
                copied_paths.append(overlay_path)

            db.table("manuscript_files").insert(
                {
                    **{column: page.get(column) for column in COPIED_FILE_COLUMNS},
                    "manuscript_id": new_id,
                    "owner_id": recipient_id,
                    "storage_path": page_path,
                    "overlay_path": overlay_path,
                }
            ).execute()
    except (APIError, StorageException) as error:
        logger.warning("Copying manuscript %s failed: %s", source_id, error)
        undo_copy(new_id, copied_paths)
        raise HTTPException(502, COPY_FAILED) from error

    return new_id


# Removes a half-finished copy. Deleting the manuscript row also deletes its file
# rows (foreign key cascade). Problems here are only logged: the original error
# is the one the user needs to see.
def undo_copy(manuscript_id: str | None, paths: list[str]) -> None:
    for path in paths:
        try:
            delete_file(path)
        except StorageException as error:
            logger.warning("Could not remove copied file %s: %s", path, error)
    if manuscript_id:
        try:
            get_admin_client().table("manuscripts").delete().eq(
                "id", manuscript_id
            ).execute()
        except APIError as error:
            logger.warning("Could not remove copied manuscript: %s", error)


# Share by username: the copy is added to the recipient's library straight away.
def share_with_user(manuscript_id: str, owner_id: str, username: str) -> ShareResponse:
    username = normalize_username(username)
    try:
        recipient_id = find_user_id(username)
    except APIError as error:
        logger.warning("Username lookup failed: %s", error)
        raise HTTPException(502, COPY_FAILED) from error

    if recipient_id is None:
        raise HTTPException(404, NOT_FOUND)
    if recipient_id == owner_id:
        raise HTTPException(400, "You can't share a manuscript with yourself.")

    new_id = copy_manuscript(manuscript_id, owner_id, recipient_id)
    return ShareResponse(id=new_id, username=username)


# Raises 404 unless the manuscript exists and belongs to user_id.
def check_owner(manuscript_id: str, user_id: str) -> None:
    try:
        rows = (
            get_admin_client()
            .table("manuscripts")
            .select("id")
            .eq("id", manuscript_id)
            .eq("owner_id", user_id)
            .execute()
            .data
        )
    except APIError as error:
        logger.warning("Supabase query failed: %s", error)
        raise HTTPException(502, READ_FAILED) from error
    if not rows:
        raise HTTPException(404, "Manuscript not found")


# Creates a link that is valid for 24 hours. The url is only returned here.
def create_share_link(manuscript_id: str, user_id: str) -> ShareLinkCreated:
    check_owner(manuscript_id, user_id)
    token = secrets.token_urlsafe(32)
    expires_at = now() + LINK_VALID_FOR
    try:
        row = (
            get_admin_client()
            .table("manuscript_share_links")
            .insert(
                {
                    "manuscript_id": manuscript_id,
                    "created_by": user_id,
                    "token_hash": hash_token(token),
                    "expires_at": expires_at.isoformat(),
                }
            )
            .execute()
            .data[0]
        )
    except APIError as error:
        logger.warning("Creating a share link failed: %s", error)
        detail = "Could not create the link. Please try again."
        raise HTTPException(502, detail) from error
    return ShareLinkCreated(
        id=row["id"],
        url=f"{settings.frontend_url}/share/{token}",
        expires_at=expires_at,
    )


# A link can be used while it is not revoked and not expired.
def is_active(link: dict) -> bool:
    return link.get("revoked_at") is None and parse_time(link["expires_at"]) > now()


def parse_time(value: str | datetime) -> datetime:
    return value if isinstance(value, datetime) else datetime.fromisoformat(value)


# The owner's active links for one manuscript, newest first.
def list_share_links(manuscript_id: str, user_id: str) -> list[ShareLink]:
    check_owner(manuscript_id, user_id)
    try:
        rows = (
            get_admin_client()
            .table("manuscript_share_links")
            .select("id, expires_at, revoked_at, created_at, use_count")
            .eq("manuscript_id", manuscript_id)
            .eq("created_by", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except APIError as error:
        logger.warning("Loading share links failed: %s", error)
        raise HTTPException(502, READ_FAILED) from error
    return [
        ShareLink(
            id=row["id"],
            expires_at=row["expires_at"],
            created_at=row["created_at"],
            use_count=row.get("use_count") or 0,
        )
        for row in rows
        if is_active(row)
    ]


# Finds an active link by its token, or raises the same 404 for every problem.
# A deleted manuscript also deletes its links (foreign key cascade).
def find_active_link(token: str) -> dict:
    try:
        rows = (
            get_admin_client()
            .table("manuscript_share_links")
            .select("id, manuscript_id, created_by, expires_at, revoked_at, use_count")
            .eq("token_hash", hash_token(token))
            .execute()
            .data
        )
    except APIError as error:
        logger.warning("Share link lookup failed: %s", error)
        raise HTTPException(502, READ_FAILED) from error
    if not rows or not is_active(rows[0]):
        raise HTTPException(404, LINK_NOT_FOUND)
    return rows[0]


# What the recipient sees before adding the manuscript.
def preview_share_link(token: str, user_id: str) -> ShareLinkPreview:
    link = find_active_link(token)
    db = get_admin_client()
    try:
        manuscript = (
            db.table("manuscripts")
            .select("title, document_type")
            .eq("id", link["manuscript_id"])
            .eq("owner_id", link["created_by"])
            .execute()
            .data
        )
        pages = (
            db.table("manuscript_files")
            .select("id")
            .eq("manuscript_id", link["manuscript_id"])
            .execute()
            .data
        )
        usernames = get_usernames([link["created_by"]])
    except APIError as error:
        logger.warning("Loading the share preview failed: %s", error)
        raise HTTPException(502, READ_FAILED) from error
    if not manuscript:
        raise HTTPException(404, LINK_NOT_FOUND)

    return ShareLinkPreview(
        title=manuscript[0]["title"],
        document_type=manuscript[0]["document_type"],
        page_count=len(pages),
        shared_by_username=usernames.get(link["created_by"]),
        is_owner=link["created_by"] == user_id,
    )


# Adds a copy of the linked manuscript to the user's library.
def accept_share_link(token: str, user_id: str) -> AcceptResponse:
    link = find_active_link(token)
    if link["created_by"] == user_id:
        raise HTTPException(400, "This is your own manuscript.")

    try:
        new_id = copy_manuscript(link["manuscript_id"], link["created_by"], user_id)
    except HTTPException as error:
        # The manuscript was deleted after the link was read
        if error.status_code == 404:
            raise HTTPException(404, LINK_NOT_FOUND) from error
        raise

    # Counting is only for information, so a failure here does not undo the copy
    try:
        get_admin_client().table("manuscript_share_links").update(
            {"use_count": (link.get("use_count") or 0) + 1}
        ).eq("id", link["id"]).execute()
    except APIError as error:
        logger.warning("Could not count the use of link %s: %s", link["id"], error)

    return AcceptResponse(id=new_id)


# Revokes a link. Only the person who created it can do this.
def revoke_share_link(link_id: str, user_id: str) -> None:
    try:
        result = (
            get_admin_client()
            .table("manuscript_share_links")
            .update({"revoked_at": now().isoformat()})
            .eq("id", link_id)
            .eq("created_by", user_id)
            .execute()
        )
    except APIError as error:
        logger.warning("Revoking share link failed: %s", error)
        detail = "Could not revoke the link. Please try again."
        raise HTTPException(502, detail) from error
    if not result.data:
        raise HTTPException(404, "Share link not found")
