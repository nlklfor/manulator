import base64
import json
import logging
from dataclasses import dataclass

import httpx
from fastapi import HTTPException
from postgrest import APIError
from storage3.utils import StorageException

from app.config import settings
from app.schemas.manuscript import ManuscriptProcessPlan, ManuscriptTranscriptResponse, ManuscriptTranslationResponse, \
    TranslationPlan
from app.services.bucket import delete_file, download_file, upload_file
from app.services.database import get_admin_client

logger = logging.getLogger(__name__)


@dataclass
class ManuscriptPage:
    id: str
    file_name: str
    content_type: str
    image_bytes: bytes
    overlay_path: str | None  # overlay saved by an earlier run, if any

@dataclass
class Transcription:
    manuscript_id: str
    lines: list[dict]



# Loads all files (pages) of a manuscript from the bucket, in page order.
# user_id must be the logged-in user, never a value sent by the client.
def load_manuscript_pages(manuscript_id: str, user_id: str) -> ManuscriptPage:
    db = get_admin_client()
    try:
        # The admin client ignores RLS, so the owner must be checked here
        manuscript = (
            db.table("manuscripts")
            .select("id")
            .eq("id", manuscript_id)
            .eq("owner_id", user_id)
            .execute()
        )
        if not manuscript.data:
            raise HTTPException(404, "Manuscript not found")

        file = (
            db.table("manuscript_files")
            .select("id, file_name, storage_path, content_type, overlay_path")
            .eq("manuscript_id", manuscript_id)
            .eq("owner_id", user_id)
            .order("position")
            .execute()
        )
    except APIError as error:
        logger.warning("Supabase query failed: %s", error)
        raise HTTPException(
            502, "Could not read the manuscript. Please try again."
        ) from error

    if not file.data:
        raise HTTPException(404, "No file found for the manuscript")

    row = file.data[0]

    try:
        data = download_file(row["storage_path"])
    except StorageException as error:
        logger.warning("Could not load file %s: %s", row["storage_path"], error)
        raise HTTPException(
            502, "Could not load the manuscript file. Please try again."
        ) from error

    return ManuscriptPage(
        row["id"], row["file_name"], row["content_type"], data, row.get("overlay_path")
    )


# process_manuscript sends the manuscript file
# and the processing plan to the ML service,
async def process_manuscript(
    user_plan: ManuscriptProcessPlan, manuscript_id: str, user_id: str
) -> ManuscriptTranscriptResponse:
    # load file from bucket
    page = load_manuscript_pages(manuscript_id, user_id)

    # send the file to the ML pipeline and get the overlay image
    # send httpx request to ml/ endpoint and get the overlay image
    files = {"file": (page.file_name, page.image_bytes, page.content_type)}
    # send the processing plan to the ML service
    form = {
        "process_plan": json.dumps(
            {
                "manuscript_id": manuscript_id,
                "steps": [],
                "plan": user_plan.plan,
                "options": user_plan.options or {},
            }
        ),
    }
    # Create a post request to the ML service
    # with a timeout of 300 seconds (5 minutes)
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{settings.ml_service_url}/api/process-manuscripts/",
                files=files,
                data=form,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail="ML service failed",
            ) from exc

    result = ManuscriptTranscriptResponse.model_validate(response.json())
    save_transcription(page, user_id, result)
    return result


# Saves the transcribed lines and the overlay image, and marks the page "transcribed".
# Each line gets its text (from "Transcribe") and its position (from "Detect Lines").
# The overlay goes to the bucket; the database only keeps its path.
def save_transcription(
    page: ManuscriptPage, user_id: str, result: ManuscriptTranscriptResponse
) -> None:
    data = result.data
    if "Transcribe" not in data:
        return  # only line detection ran, there is no text to save
    positions = {line["index"]: line for line in data["Detect Lines"]["lines"]}
    lines = [
        {**positions.get(line["index"], {}), **line}
        for line in data["Transcribe"]["lines"]
    ]
    # "data:image/jpeg;base64,<data>" -> the JPEG bytes
    overlay = base64.b64decode(result.overlay.split(",", 1)[-1])

    overlay_path = None
    try:
        overlay_path, _ = upload_file(overlay, "image/jpeg", user_id, "overlays")
        get_admin_client().table("manuscript_files").update(
            {
                "transcription": lines,
                "overlay_path": overlay_path,
                "status": "transcribed",
            }
        ).eq("id", page.id).eq("owner_id", user_id).execute()
    except (APIError, StorageException) as error:
        logger.warning("Saving the transcription failed: %s", error)
        if overlay_path:
            delete_file(overlay_path)  # not linked to any row, so remove it
        raise HTTPException(
            502, "Could not save the transcription. Please try again."
        ) from error

    # A re-run replaces the overlay, so the old one is no longer needed
    if page.overlay_path:
        try:
            delete_file(page.overlay_path)
        except StorageException as error:
            logger.warning("Could not delete old overlay: %s", error)

# This method loads the transcribed lines from the database.
def load_transcription(manuscript_id: str, user_id: str) -> Transcription:
    # Read the manuscript from the database
    db = get_admin_client()
    try:
        # The admin client ignores RLS, so the owner must be checked here
        manuscript = (
            db.table("manuscripts")
            .select("id")
            .eq("id", manuscript_id)
            .eq("owner_id", user_id)
            .execute()
        )
        if not manuscript.data:
            raise HTTPException(404, "Manuscript not found")

        # load the transcribed lines from the database
        transcribed_lines = (
            db.table("manuscript_files")
            .select("transcription")
            .eq("manuscript_id", manuscript_id)
            .eq("owner_id", user_id)
            .order("position")
            .execute()
        )

    except APIError as error:
        logger.warning("Supabase query failed: %s", error)
        raise HTTPException(
            502, "Could not read the manuscript. Please try again."
        ) from error

    if not transcribed_lines.data or len(transcribed_lines.data) == 0:
        raise HTTPException(404, "No transcribed lines found or the manuscript has not been transcribed yet")

    row = transcribed_lines.data[0]

    if not row.get("transcription"):
        raise HTTPException(404, "The manuscript has not been transcribed yet")
    # Read the transcribed lines and return them as a list of dicts with "index" and "text"
    lines = []
    for line in row["transcription"]:
        if not line.get("text"):
            continue
        text = line.get("text")
        index = line.get("index")
        lines.append({"index": index, "text": text})

    transcription = Transcription(manuscript_id=manuscript_id, lines=lines)
    return transcription

# This function reads the transcribed lines from the database and forwards them to the ML service for translation.
# The ML service returns the translated lines
# The translated lines are not saved in the database yet
async def translate_manuscript(manuscript_id: str, translation_plan: TranslationPlan, user_id: str) -> ManuscriptTranslationResponse:
    if translation_plan.target_language != "en":
        raise HTTPException(400, "Only translation to English is supported at the moment")

    # load the transcribed lines from the database
    transcription = load_transcription(manuscript_id, user_id)
    data = {"manuscript_id": manuscript_id, "lines": transcription.lines,
            "plan": translation_plan.plan, "target_language": translation_plan.target_language}

    # Create a post request to the ML service
    # with a timeout of 300 seconds (5 minutes)
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{settings.ml_service_url}/api/process-manuscripts/translate",
                json=data,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail="ML service failed",
            ) from exc

    result = ManuscriptTranslationResponse.model_validate(response.json())

    # save translation
    #save_translation(text)

    return result