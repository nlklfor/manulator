"""Look at a manuscript page and guess its century, script, language, region and document type.

The page image is sent to a vision model together with PROMPT (the question below). The model
must answer in the Classification format, and script and document type must be one of the
allowed values. The model is set in ml/.env (CLASSIFIER_MODEL): see services/llm.py.
How well each model works: ml/eval/README.md.
"""

import io
from typing import Literal

from PIL import Image
from pydantic import BaseModel

from app.config import settings
from services.llm import PageImage, get_model


# The 12 scripts experts use for medieval Latin handwriting (the CLaMM list,
# explained in docs/research/classifiers/script.md), plus "Other" and "unknown"
Script = Literal[
    "Caroline", "Cursiva", "Half-Uncial", "Humanistic", "Humanistic Cursive", "Hybrida",
    "Praegothica", "Semihybrida", "Semitextualis", "Southern Textualis", "Textualis",
    "Uncial", "Other", "unknown",
]
# Must be the same list as the upload form (frontend/src/features/upload-manuscript/constants/documentTypes.ts)
DocumentType = Literal["Charter", "Register", "Letter", "Cartulary", "Chronicle", "Book", "Other"]

PROMPT = """This is a page, or part of a page, from a historical manuscript. Identify its century, script, language, region and document type.

Script: choose the class whose letter forms match best. Look at the shape of a, whether f and long s stand on the line or go below it, and whether the ascenders of b, h, k, l have loops.
- Uncial: mostly capitals, almost no ascenders or descenders
- Half-Uncial: minuscule; mainly open a; vertical d; 3- or z-shaped g; t with a loop on the left
- Caroline: minuscule; round uncial a; half-uncial d; g with a small round eye; flat-topped t
- Praegothica: Caroline with lateral compression (narrower letters, fusions); vertical uncial a; f and long s on the line
- Textualis: two-compartment a; f and long s on the line; ascenders without loops
- Semitextualis: Textualis, but with a single-compartment a
- Southern Textualis (Rotunda): the Mediterranean Textualis, with broad round bows (b, c, d, e, h, o, p, q, round r)
- Cursiva: single-compartment a; f and long s go below the line; loops on the ascenders
- Hybrida: single-compartment a; f and long s go below the line; ascenders without loops
- Semihybrida: Hybrida in which only some ascenders lack loops
- Humanistic: upright script imitating Caroline, with dotted i
- Humanistic Cursive: Humanistic with cursive forms and an italic slant
Use "Other" for a script outside these classes (e.g. Insular or Beneventan).

Century: give one century in the form "13th century", the most likely one even if you are not sure.

Region: where the manuscript was written, judged from the script, language and decoration. Ignore modern additions such as library labels, stamps, shelfmarks and foliation: they tell where the manuscript is kept today, not where it was made.

Document type: "Book" is a codex page with a literary, religious, legal or scholarly text; "Charter", "Letter" and "Register" are documents of practice; "Cartulary" is a book of copied charters.

Use "unknown" for anything you cannot tell."""


class Classification(BaseModel):
    century: str  # e.g. "13th century"
    script: Script
    language: str
    region: str
    document_type: DocumentType


def classify_page(image: bytes, media_type: str) -> Classification:
    """Ask the app's model (CLASSIFIER_MODEL in ml/.env) about one page."""
    if media_type not in ("image/jpeg", "image/png"):  # the models only take JPEG or PNG (e.g. not TIFF)
        image, media_type = to_jpeg(image), "image/jpeg"
    classify, _ = get_classifier(settings.classifier_model)
    return classify(image, media_type)


def to_jpeg(image: bytes) -> bytes:
    picture = Image.open(io.BytesIO(image))  # only the first page of a multi-page TIFF
    if picture.mode.startswith("I"):  # 16 or 32 bit grey, e.g. from a scanner
        picture = picture.convert("I").point(lambda value: value / 256).convert("L")
    elif picture.mode not in ("L", "RGB"):  # e.g. with transparency, CMYK or a palette
        picture = picture.convert("RGB")
    buffer = io.BytesIO()
    picture.save(buffer, "JPEG", quality=90)
    return buffer.getvalue()


def get_classifier(choice: str, effort: str | None = None):
    """Turn a model name (see services/llm.py) into a function (image, media_type) -> Classification.

    Also returns a short name for the model and its settings, used by the tests to save answers.
    """
    ask, name = get_model(choice, effort)
    return (lambda image, media_type: ask(PROMPT, Classification, PageImage(image, media_type))), name
