"""Ask a language model a question and get the answer in a fixed format.

Used by the classifier (services/classification.py: question + page image) and the
summarizer (services/summarization.py: question + translated text).
The answer must fit a pydantic model, e.g. Classification: every field is a string,
and a Literal field may only take one of its allowed values.

The models, chosen by name:
  claude-haiku-5-5          Claude (Anthropic). Needs ANTHROPIC_API_KEY in ml/.env
  claude-sonnet-5-5         (Haiku is the default: cheap. Sonnet is better but ~10x the price)
  gemini:gemini-3.5-flash   Google Gemini (any model name from Google). Needs GEMINI_API_KEY in ml/.env
  local:gemma-4-12b-it      a free model on our own GPU, run by llama.cpp (the "llama-server"
  local:qwen3.5-9b          container, see ml/eval/README.md). The name after "local:" is only a label:
                            the app uses the model the container was started with.

The app uses the model set in ml/.env (CLASSIFIER_MODEL, default claude-haiku-5-5).
The tests in ml/eval/ can try any of them with --model.
"""

import base64
import json
import time
import typing
import urllib.error
import urllib.request
from collections.abc import Callable
from functools import lru_cache

import anthropic
from pydantic import BaseModel

from app.config import settings


class QuotaUsedUp(RuntimeError):
    """The model's provider refuses more requests for now (e.g. Gemini's free tier: 20 per day)."""


class PageImage(typing.NamedTuple):
    data: bytes
    media_type: str  # "image/jpeg" or "image/png"


# ask(prompt, answer_type=None, image=None) -> an answer_type object,
# or plain text when answer_type is None (e.g. a summary)
Ask = Callable[..., typing.Any]


def answer_format(answer_type: type[BaseModel]) -> dict:
    """Describe the answer we want: its fields, with their allowed values (JSON Schema)."""
    fields = {}
    for name, field in answer_type.model_fields.items():
        allowed_values = typing.get_args(field.annotation)  # e.g. ("Charter", "Register", ...), or () for free text
        fields[name] = {"type": "string"}
        if allowed_values:
            fields[name]["enum"] = list(allowed_values)
    return {"type": "object", "properties": fields, "required": list(fields), "additionalProperties": False}


def get_model(choice: str, effort: str | None = None) -> tuple[Ask, str]:
    """Turn a model name into a function ask(prompt, answer_type=None, image=None).

    With an answer_type the model must answer in that format; without one it answers in
    plain text. Free text is better asked as plain text: inside a forced JSON format some
    models end the text too early (Gemma 4 on llama.cpp stopped summaries mid-sentence).

    Also returns a short name for the model and its settings, used by the tests to save answers.
    """
    if choice.startswith("local:"):
        return ask_llama_cpp, f"{choice}/temperature0"
    if choice.startswith("claude-"):
        if not settings.anthropic_api_key:
            raise ValueError("Put ANTHROPIC_API_KEY=... in ml/.env to use Claude")
        effort = effort or "low"
        return (lambda prompt, answer_type=None, image=None:
                ask_claude(prompt, answer_type, image, choice, effort)), f"{choice}/{effort}"
    if choice.startswith("gemini:"):
        if not settings.gemini_api_key:
            raise ValueError("Put GEMINI_API_KEY=... in ml/.env to use Gemini")
        model = choice.split(":", 1)[1]
        return (lambda prompt, answer_type=None, image=None:
                ask_gemini(prompt, answer_type, image, model, effort)), f"{choice}/{effort or 'default'}"
    raise ValueError(f"Unknown model '{choice}'. Use a Claude model (e.g. claude-haiku-5-5), "
                     "gemini:<name> (e.g. gemini:gemini-3.5-flash) or local:<name> for the model on our own GPU")


def to_base64(data: bytes) -> str:
    return base64.standard_b64encode(data).decode()


@lru_cache
def claude_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def ask_claude(prompt: str, answer_type: type[BaseModel] | None, image: PageImage | None, model: str, effort: str):
    """Ask a Claude model."""
    content = [{"type": "text", "text": prompt}]
    if image:
        content.insert(0, {"type": "image", "source": {
            "type": "base64", "media_type": image.media_type, "data": to_base64(image.data)}})
    settings_ = {"model": model, "max_tokens": 4096, "output_config": {"effort": effort},
                 "messages": [{"role": "user", "content": content}]}
    if answer_type is None:
        response = claude_client().messages.create(**settings_)
    else:
        response = claude_client().messages.parse(**settings_, output_format=answer_type)
    if response.stop_reason == "refusal":
        raise RuntimeError("The model refused to answer")
    if answer_type is None:
        return "".join(block.text for block in response.content if block.type == "text")
    return response.parsed_output


def ask_llama_cpp(prompt: str, answer_type: type[BaseModel] | None = None, image: PageImage | None = None):
    """Ask the model on our own GPU. llama.cpp's server answers like OpenAI's chat API."""
    content = [{"type": "text", "text": prompt}]
    if image:
        content.insert(0, {"type": "image_url",
                           "image_url": {"url": f"data:{image.media_type};base64,{to_base64(image.data)}"}})
    body = {
        "messages": [{"role": "user", "content": content}],
        # Always pick the most likely answer, so the same input gives the same result every time
        "temperature": 0,
    }
    if answer_type:  # forces the answer into our format, with only allowed values
        body["response_format"] = {"type": "json_schema",
                                   "json_schema": {"name": "answer", "schema": answer_format(answer_type)}}
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
    text = reply["choices"][0]["message"]["content"]
    return answer_type.model_validate_json(text) if answer_type else text


def ask_gemini(prompt: str, answer_type: type[BaseModel] | None, image: PageImage | None, model: str,
               effort: str | None = None):
    """Ask a Google Gemini model. effort ("low", "high"...) sets how much it thinks; Gemini 3 and newer only."""
    config = {}
    if answer_type:
        # Gemini's answer format: like answer_format(), but with its own type names and no additionalProperties
        schema = answer_format(answer_type)
        schema = {"type": "OBJECT", "required": schema["required"], "propertyOrdering": schema["required"],
                  "properties": {name: {**field, "type": "STRING"} for name, field in schema["properties"].items()}}
        config = {"responseMimeType": "application/json", "responseSchema": schema}
    if effort:
        config["thinkingConfig"] = {"thinkingLevel": effort}
    parts = [{"text": prompt}]
    if image:
        parts.insert(0, {"inline_data": {"mime_type": image.media_type, "data": to_base64(image.data)}})
    body = {"contents": [{"parts": parts}], "generationConfig": config}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    request = urllib.request.Request(url, json.dumps(body).encode(),
                                     {"Content-Type": "application/json", "x-goog-api-key": settings.gemini_api_key})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                reply = json.load(response)
            break
        except urllib.error.HTTPError as error:
            message = error.read()[:300].decode(errors="replace")
            # 429 = too many requests or quota used up, 500/503 = busy: wait a little and try again,
            # but at most ~30 s in total, so the user is not kept waiting
            if error.code in (429, 500, 503) and attempt < 2:
                time.sleep(min(int(error.headers.get("Retry-After") or 0) or 5 * (attempt + 1), 15))
                continue
            if error.code == 429:
                raise QuotaUsedUp("Gemini quota used up (too many requests). Try again later, "
                                  f"or check the plan of GEMINI_API_KEY. Gemini said: {message}") from None
            raise RuntimeError(f"Gemini answered HTTP {error.code}: {message}") from None
    candidates = reply.get("candidates") or [{}]
    if "content" not in candidates[0]:  # Gemini sometimes blocks an answer, e.g. for "safety"
        raise RuntimeError(f"Gemini gave no answer: {candidates[0].get('finishReason') or reply.get('promptFeedback')}")
    text = "".join(part.get("text", "") for part in candidates[0]["content"]["parts"] if not part.get("thought"))
    return answer_type.model_validate_json(text) if answer_type else text  # fails if the answer has wrong values
