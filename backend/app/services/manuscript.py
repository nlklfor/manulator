import base64
import logging
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException
from postgrest import APIError
from storage3.utils import StorageException

from app.schemas.manuscript import ManuscriptProcessPlan, ManuscriptTranscriptResponse
from app.services.bucket import download_file
from app.services.database import get_admin_client

logger = logging.getLogger(__name__)

ML_DIR = Path(__file__).resolve().parents[3] / "ml"


@dataclass
class ManuscriptPage:
    file_name: str
    content_type: str
    data: bytes


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


# ml/ has its own environment (Kraken, torch), so the pipeline runs there
# and the backend only reads the overlay image it produces.
# action is the name of the pipeline action to run, e.g. "Detect Lines"
# image_id is the manuscript id, used to name the overlay file.
def run_ml_pipeline(action: str, image_id: str, image: bytes) -> bytes:
    # delete_on_close=False lets us close the file before the subprocess reads it;
    # Windows does not allow another process to open a still-open temp file.
    with tempfile.NamedTemporaryFile(delete_on_close=False) as tmp:
        tmp.write(image)
        tmp.close()
        try:
            completed = subprocess.run(
                ["uv", "run", "python", "pipeline.py", action, image_id, tmp.name],
                cwd=ML_DIR,
                capture_output=True,
                text=True,
                check=True,
                timeout=600,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
            logger.warning("ML pipeline failed: %s", getattr(error, "stderr", error))
            raise HTTPException(500, "Could not process the manuscript.") from error

    overlay = Path(completed.stdout.strip().splitlines()[-1])
    return (ML_DIR / overlay).read_bytes()

#
def process_manuscript(
    plan: ManuscriptProcessPlan, user_id: str
) -> ManuscriptTranscriptResponse:
    # load file from bucket
    page = load_manuscript_pages(plan.manuscript_id, user_id)
    # run the ML pipeline in the ml/ environment and get the overlay image
    overlay = run_ml_pipeline(plan.input, plan.manuscript_id, page.data)

    return ManuscriptTranscriptResponse(
        manuscript_id=plan.manuscript_id,
        overlay="data:image/jpeg;base64," + base64.b64encode(overlay).decode(),
    )
