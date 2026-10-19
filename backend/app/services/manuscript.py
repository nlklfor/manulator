import json
import logging
from dataclasses import dataclass
from pathlib import Path

import httpx
from fastapi import HTTPException
from postgrest import APIError
from storage3.utils import StorageException

from app.schemas.manuscript import ManuscriptProcessPlan, ManuscriptTranscriptResponse
from app.services.bucket import download_file
from app.services.database import get_admin_client

logger = logging.getLogger(__name__)

ML_DIR = Path(__file__).resolve().parents[3] / "ml"
ML_SERVICE_URL = "http://127.0.0.1:8001"



@dataclass
class ManuscriptPage:
    file_name: str
    content_type: str
    image_bytes: bytes


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
            .select("file_name, storage_path, content_type")
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

    return ManuscriptPage(row["file_name"], row["content_type"], data)

# process_manuscript sends the manuscript file
# and the processing plan to the ML service,
async def process_manuscript(
    user_plan: ManuscriptProcessPlan, user_id: str
) -> ManuscriptTranscriptResponse:
    # load file from bucket
    page = load_manuscript_pages(user_plan.manuscript_id, user_id)

    # send the file to the ML pipeline and get the overlay image
    # send httpx request to ml/ endpoint and get the overlay image
    files = {
        "file": (page.file_name, page.image_bytes, page.content_type)
    }
    # send the processing plan to the ML service
    form = {
        "process_plan": json.dumps({
            "manuscript_id": user_plan.manuscript_id,
            "steps": [],
            "plan": user_plan.plan,
            "options": user_plan.options or {},
        }),
    }
    # Create a post request to the ML service
    # with a timeout of 300 seconds (5 minutes)
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{ML_SERVICE_URL}/api/process-manuscripts/",
                files=files,
                data=form,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail="ML service failed",
            ) from exc

    return ManuscriptTranscriptResponse.model_validate(response.json())

