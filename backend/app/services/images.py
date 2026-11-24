import io
import mimetypes

from PIL import Image, UnidentifiedImageError

from app.services.pdf import PdfError, first_page_to_png

# Browsers can show these, and the models can read them: they are kept as they are
WEB_TYPES = {"image/jpeg", "image/png", "image/webp"}


class PageError(Exception):
    """The file is not a readable image or PDF."""


# The file's type: the one the browser sent, or (if none) guessed from the file name
def content_type_of(content_type: str | None, filename: str | None) -> str:
    if content_type and content_type != "application/octet-stream":
        return content_type
    return mimetypes.guess_type(filename or "")[0] or "application/octet-stream"


def is_supported(content_type: str) -> bool:
    return content_type.startswith("image/") or content_type == "application/pdf"


# Turns an uploaded file into a page image for browsers and models, as (bytes, type).
# JPEG, PNG and WebP stay as they are. Any other image (TIFF, BMP, JPEG 2000...)
# and the first page of a PDF become PNG: lossless, so thin pen strokes stay sharp.
def to_page_image(data: bytes, content_type: str) -> tuple[bytes, str]:
    if content_type in WEB_TYPES:
        return data, content_type
    if content_type == "application/pdf":
        try:
            return first_page_to_png(data), "image/png"
        except PdfError as error:
            raise PageError(
                "Could not read the PDF. It may be damaged or password protected."
            ) from error
    try:
        image = Image.open(io.BytesIO(data))  # only the first page of a multi-page TIFF
        if image.mode.startswith("I"):  # 16 or 32 bit grey, e.g. from a scanner
            image = image.convert("I").point(lambda value: value / 256).convert("L")
        elif image.mode not in ("1", "L", "LA", "RGB", "RGBA"):  # e.g. CMYK, palette
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        out = io.BytesIO()
        image.save(out, "PNG")
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise PageError("Could not read the image. It may be damaged.") from error
    return out.getvalue(), "image/png"
