import base64
from functools import lru_cache

import anthropic
from pydantic import BaseModel

from app.config import settings

# Cheapest Claude model with vision
MODEL = "claude-haiku-5-5"

PROMPT = (
    "This is a page from a historical manuscript. Identify its century, script, "
    "language, region and document type. Use 'unknown' for anything you cannot tell."
)


class Classification(BaseModel):
    century: str  # e.g. "13th century"
    script: str  # e.g. "Gothic textualis"
    language: str
    region: str
    document_type: str  # e.g. "charter", "codex", "letter"


@lru_cache
def get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def classify_page(image: bytes, media_type: str) -> Classification:
    response = get_client().messages.parse(
        model=MODEL,
        max_tokens=4096,
        output_config={"effort": "low"},
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64.standard_b64encode(image).decode(),
                }},
                {"type": "text", "text": PROMPT},
            ],
        }],
        output_format=Classification,
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Model refused to classify the page")
    return response.parsed_output
