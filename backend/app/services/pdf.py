import io

import pypdfium2 as pdfium

# 300 DPI is a common resolution for handwriting recognition.
# A PDF page is measured in points, 72 per inch.
DPI = 300
MAX_SIDE = 4000  # px, so a huge page cannot use up all the memory


class PdfError(Exception):
    """The PDF could not be read (broken, empty or password protected)."""


# Renders the first page of a PDF as a PNG image and returns the PNG bytes.
# PNG is lossless, so thin pen strokes are not blurred.
def first_page_to_png(data: bytes) -> bytes:
    try:
        pdf = pdfium.PdfDocument(data)
        try:
            if len(pdf) == 0:
                raise PdfError("The PDF has no pages.")
            page = pdf[0]
            width, height = page.get_size()
            scale = min(DPI / 72, MAX_SIDE / max(width, height))
            image = page.render(scale=scale).to_pil().convert("RGB")
        finally:
            pdf.close()
    except pdfium.PdfiumError as error:
        raise PdfError(str(error)) from error

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
