"""Look at a manuscript page and guess its century, script, language, region and document type.

The page image is sent to a vision model together with PROMPT (the question below). The model
must answer in the Classification format, and script and document type must be one of the
allowed values. The model is Claude or a free model on our own GPU: see "The models" below.
How well each model works: ml/eval/README.md.
"""

import base64
import json
import typing
import urllib.error
import urllib.request
from functools import lru_cache
from typing import Literal

import anthropic
from pydantic import BaseModel

from app.config import settings

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


def answer_format() -> dict:
    """Describe the answer we want: the Classification fields, with their allowed values (JSON Schema)."""
    fields = {}
    for name, field in Classification.model_fields.items():
        allowed_values = typing.get_args(field.annotation)  # e.g. ("Charter", "Register", ...), or () for free text
        fields[name] = {"type": "string"}
        if allowed_values:
            fields[name]["enum"] = list(allowed_values)
    return {"type": "object", "properties": fields, "required": list(fields), "additionalProperties": False}


# ---------- The models ----------
#
# Two kinds of model, chosen by name:
#   claude-haiku-5-5          Claude (Anthropic). Needs ANTHROPIC_API_KEY in ml/.env
#   claude-sonnet-5-5         (Haiku is the default: cheap. Sonnet is better but ~10x the price)
#   local:gemma-4-12b-it      a free model on our own GPU, run by llama.cpp (the "llama-server"
#   local:qwen3.5-9b          container, see ml/eval/README.md). The name after "local:" is only a label:
#                             the app uses the model the container was started with.
#
# The app uses the model set in ml/.env (CLASSIFIER_MODEL, default claude-haiku-5-5).
# The tests in ml/eval/ can try any of them with --model.


def classify_page(image: bytes, media_type: str) -> Classification:
    """Ask the app's model (CLASSIFIER_MODEL in ml/.env) about one page."""
    classify, _ = get_classifier(settings.classifier_model)
    return classify(image, media_type)


def get_classifier(choice: str, effort: str | None = None):
    """Turn a model name into a function (image, media_type) -> Classification.

    Also returns a short name for the model and its settings, used by the tests to save answers.
    """
    if choice.startswith("local:"):
        return (lambda image, media_type: ask_llama_cpp(image, media_type)), f"{choice}/temperature0"
    if choice.startswith("claude-"):
        if not settings.anthropic_api_key:
            raise ValueError("Put ANTHROPIC_API_KEY=... in ml/.env to use Claude")
        effort = effort or "low"
        return (lambda image, media_type: ask_claude(image, media_type, choice, effort)), f"{choice}/{effort}"
    raise ValueError(f"Unknown model '{choice}'. Use a Claude model (e.g. claude-haiku-5-5) "
                     "or local:<name> for the model on our own GPU")


@lru_cache
def claude_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def ask_claude(image: bytes, media_type: str, model: str, effort: str) -> Classification:
    """Ask a Claude model."""
    response = claude_client().messages.parse(
        model=model,
        max_tokens=4096,
        output_config={"effort": effort},
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {
                "type": "base64", "media_type": media_type, "data": base64.standard_b64encode(image).decode()}},
            {"type": "text", "text": PROMPT},
        ]}],
        output_format=Classification,
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Model refused to classify the page")
    return response.parsed_output


def ask_llama_cpp(image: bytes, media_type: str) -> Classification:
    """Ask the model on our own GPU. llama.cpp's server answers like OpenAI's chat API."""
    body = {
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{base64.b64encode(image).decode()}"}},
            {"type": "text", "text": PROMPT},
        ]}],
        # Forces the answer into our format, with only allowed values
        "response_format": {"type": "json_schema", "json_schema": {"name": "classification", "schema": answer_format()}},
        # Always pick the most likely answer, so the same page gives the same result every time
        "temperature": 0,
    }
    url = f"{settings.local_base_url.rstrip('/')}/chat/completions"
    request = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            reply = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"llama.cpp answered HTTP {error.code}: {error.read()[:300].decode(errors='replace')}") from None
    except urllib.error.URLError as error:
        raise RuntimeError(f"Cannot reach llama.cpp at {settings.local_base_url} ({error.reason}). "
                           "Is the llama-server container running?") from None
    return Classification.model_validate_json(reply["choices"][0]["message"]["content"])
