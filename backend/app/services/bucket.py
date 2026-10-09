import io
import uuid

from PIL import Image, ImageOps

from app.config import settings
from app.services.database import get_admin_client

EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
MAX_IMAGE_SIDE = 2048  # px
QUALITY = 80
URL_EXPIRES_IN = 3600  # seconds


# Saves to <user_id>/<folder>/<random>.<ext> and returns (path, url).
# public=True: public bucket, the url is permanent
# public=False: private bucket, the url lasts 1 hour
def upload_file(
    data: bytes,
    content_type: str,
    user_id: str,
    folder: str,
    compress: bool = False,
    public: bool = False,
) -> tuple[str, str]:
    if content_type not in EXTENSIONS:
        raise ValueError(f"Unsupported file type: {content_type}")
    for part in (user_id, folder):
        if not part or "/" in part or ".." in part:
            raise ValueError(f"Invalid path part: {part!r}")

    if compress and content_type.startswith("image/"):
        data = compress_image(data, content_type)

    path = f"{user_id}/{folder}/{uuid.uuid4().hex}{EXTENSIONS[content_type]}"
    name = settings.public_bucket if public else settings.storage_bucket
    bucket = get_admin_client().storage.from_(name)
    bucket.upload(path, data, {"content-type": content_type})

    if public:
        return path, bucket.get_public_url(path)
    return path, get_file_url(path)


# New 1-hour link for a file in the private bucket
# Only pass paths that belong to the logged-in user.
def get_file_url(path: str) -> str:
    bucket = get_admin_client().storage.from_(settings.storage_bucket)
    return bucket.create_signed_url(path, URL_EXPIRES_IN)["signedUrl"] or ""


# Resizes and re-encodes an image to reduce its size.
def compress_image(data: bytes, content_type: str) -> bytes:
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
    image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))

    out = io.BytesIO()
    if content_type == "image/jpeg":
        image.convert("RGB").save(out, "JPEG", quality=QUALITY, optimize=True)
    elif content_type == "image/webp":
        image.save(out, "WEBP", quality=QUALITY)
    else:
        image.save(out, "PNG", optimize=True)

    # Keep the original if re-encoding made it bigger
    return out.getvalue() if out.tell() < len(data) else data
