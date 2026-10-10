import io
import logging

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from postgrest.exceptions import APIError
from storage3.utils import StorageException

from app.config import settings
from app.services.bucket import upload_file
from app.services.database import get_admin_client

logger = logging.getLogger(__name__)

PROFILE_COLUMNS = "id,email,display_name,avatar_url,created_at"
AVATAR_FOLDER = "avatar"
MAX_AVATAR_MB = 5
# Allowed picture types and the format Pillow must detect inside the file
AVATAR_FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
# Every avatar is stored as WebP, at most 512 x 512 px (sharp enough for the
# 80 px profile picture on high resolution screens, and only ~20-50 KB)
AVATAR_SIZE = 512
AVATAR_QUALITY = 80


# Saves a new profile picture and stores its link in the profile.
# Whatever the user uploads (JPG, PNG or WebP) is converted to a WebP file.
def set_avatar(file: UploadFile, user_id: str) -> dict:
    if file.content_type not in AVATAR_FORMATS:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Please upload a JPG, PNG or WebP image.",
        )

    # Read one byte more than allowed, so we know if the file is too big
    max_bytes = MAX_AVATAR_MB * 1024 * 1024
    data = file.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"The picture must be smaller than {MAX_AVATAR_MB} MB.",
        )

    check_image(data, file.content_type)
    webp = convert_to_webp(data)

    # Read the current picture first: if the database can't be reached,
    # we stop here before anything is uploaded
    old_url = get_profile(user_id).get("avatar_url")

    try:
        path, url = upload_file(webp, "image/webp", user_id, AVATAR_FOLDER, public=True)
    except StorageException as error:
        logger.warning("Avatar upload failed: %s", error)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "Could not save the picture. Please try again."
        ) from error

    try:
        profile = update_profile(user_id, {"avatar_url": url})
    except HTTPException:
        # The link could not be saved: remove the new file again, so no unused
        # file stays in the bucket, and show the error to the user
        delete_avatar_path(path)
        raise

    delete_avatar_file(old_url, user_id)
    return profile


# Removes the profile picture, the app then shows the user's initials again
def remove_avatar(user_id: str) -> dict:
    old_url = get_profile(user_id).get("avatar_url")
    profile = update_profile(user_id, {"avatar_url": None})
    delete_avatar_file(old_url, user_id)
    return profile


# Makes sure the bytes really are a picture of the type the browser claimed.
# Stops e.g. a renamed PDF or HTML file from being saved as "image/png".
def check_image(data: bytes, content_type: str) -> None:
    try:
        with Image.open(io.BytesIO(data)) as image:
            detected = image.format
            image.verify()  # reads the whole file and fails if it is broken
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError):
        detected = None

    if detected != AVATAR_FORMATS[content_type]:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "This file is not a valid image."
        )


# Turns any allowed picture into a small WebP image:
# rotates it the right way up (phone photos), shrinks it to AVATAR_SIZE
# and keeps a transparent background if the picture has one.
def convert_to_webp(data: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(data)) as original:
            image = ImageOps.exif_transpose(original)
            has_alpha = "A" in image.getbands() or "transparency" in image.info
            image = image.convert("RGBA" if has_alpha else "RGB")
            image.thumbnail((AVATAR_SIZE, AVATAR_SIZE))

            out = io.BytesIO()
            image.save(out, "WEBP", quality=AVATAR_QUALITY, method=6)
            return out.getvalue()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as error:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "This file is not a valid image."
        ) from error


def get_profile(user_id: str) -> dict:
    query = (
        get_admin_client().table("profiles").select(PROFILE_COLUMNS).eq("id", user_id)
    )
    response = run_query(query)
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found.")
    return response.data[0]


def update_profile(user_id: str, changes: dict) -> dict:
    query = get_admin_client().table("profiles").update(changes).eq("id", user_id)
    response = run_query(query)
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found.")
    row = response.data[0]
    return {column: row.get(column) for column in PROFILE_COLUMNS.split(",")}


# Runs a database query. A database error (e.g. missing permissions) becomes a
# readable 502 answer instead of a crash: after a crash the browser only shows
# a misleading CORS error, because crash responses have no CORS header.
def run_query(query):
    try:
        return query.execute()
    except APIError as error:
        logger.error("Profile query failed: %s", error)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Could not save your profile. Please try again later.",
        ) from error


# Deletes the old picture from storage so unused files don't pile up.
# Only files in this user's own avatar folder are ever deleted.
# A failure here is only logged: the profile is already updated.
def delete_avatar_file(url: str | None, user_id: str) -> None:
    marker = f"/object/public/{settings.public_bucket}/"
    if not url or marker not in url:
        return

    path = url.split(marker, 1)[1].split("?", 1)[0]
    if not path.startswith(f"{user_id}/{AVATAR_FOLDER}/"):
        return

    delete_avatar_path(path)


# Deletes one file from the avatars bucket. A failure is only logged.
def delete_avatar_path(path: str) -> None:
    try:
        get_admin_client().storage.from_(settings.public_bucket).remove([path])
    except StorageException as error:
        logger.warning("Could not delete avatar %s: %s", path, error)
