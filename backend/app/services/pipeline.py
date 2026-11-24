import logging

from fastapi import HTTPException

from app.schemas.manuscript import (
    ManuscriptProcessPlan,
    ManuscriptProgress,
    TranslationPlan,
)
from app.services import manuscript

logger = logging.getLogger(__name__)

# The full pipeline, run after a page is uploaded: transcribe, translate sentence by
# sentence, summarize. Each step saves its result and its status in manuscript_files:
#   transcribing → transcribed → translating → translated → summarizing → summarized
# The frontend polls /progress to show the status of each step.
RUNNING_STATUSES = {"transcribing", "translating", "summarizing"}

# Pipelines running in this backend process, and the error of the last failed run.
# Kept in memory: a restart forgets them, and /progress then repairs the status.
running: set[str] = set()
errors: dict[str, str] = {}


# Checks the page and marks it "transcribing", so /progress shows the run at once.
# The steps themselves run in the background (run_pipeline).
def start_pipeline(manuscript_id: str, user_id: str) -> ManuscriptProgress:
    page = manuscript.load_first_page(manuscript_id, user_id, "status")
    if manuscript_id in running:
        raise HTTPException(409, "The pipeline is already running for this page.")
    running.add(manuscript_id)
    errors.pop(manuscript_id, None)
    manuscript.save_page(manuscript_id, user_id, {"status": "transcribing"})
    logger.info("Pipeline started for %s (was %s)", manuscript_id, page["status"])
    return ManuscriptProgress(manuscript_id=manuscript_id, status="transcribing")


async def run_pipeline(manuscript_id: str, user_id: str) -> None:
    try:
        # 1. Transcribe (saves the lines and "transcribed")
        result = await manuscript.process_manuscript(
            ManuscriptProcessPlan(steps=[], plan="Transcribe", options={}),
            manuscript_id,
            user_id,
        )
        if not result.success or not result.data.get("Transcribe", {}).get("lines"):
            raise PipelineError("No text was found on the page.")

        # 2. Translate sentence by sentence (saves the translation and "translated")
        manuscript.save_page(manuscript_id, user_id, {"status": "translating"})
        translation = await manuscript.translate_manuscript(
            manuscript_id, TranslationPlan(type="sentences"), user_id
        )
        if not translation.success or not translation.translated_lines:
            raise PipelineError("The page could not be translated.")

        # 3. Summarize the translation (saves the summary and "summarized")
        manuscript.save_page(manuscript_id, user_id, {"status": "summarizing"})
        await manuscript.summarize_manuscript(manuscript_id, user_id)
    except Exception as error:
        message = str(error.detail) if isinstance(error, HTTPException) else str(error)
        logger.warning("Pipeline for %s stopped: %s", manuscript_id, message)
        errors[manuscript_id] = message or "The pipeline stopped."
        try:  # back to the last finished step
            page = manuscript.load_first_page(
                manuscript_id, user_id, "transcription, translation, summary"
            )
            manuscript.save_page(
                manuscript_id, user_id, {"status": finished_status(page)}
            )
        except HTTPException:
            logger.warning("Could not reset the status of %s", manuscript_id)
    finally:
        running.discard(manuscript_id)


class PipelineError(Exception):
    pass


# The status of the last step whose result is saved
def finished_status(page: dict) -> str:
    if page.get("summary"):
        return "summarized"
    if page.get("translation"):
        return "translated"
    if page.get("transcription"):
        return "transcribed"
    return "uploaded"


# The page's status and the results saved so far, for the frontend to poll
def get_progress(manuscript_id: str, user_id: str) -> ManuscriptProgress:
    page = manuscript.load_first_page(
        manuscript_id, user_id, "status, transcription, translation, summary"
    )
    status = page["status"]
    # Still marked running, but no pipeline runs (e.g. the backend restarted): repair it
    if status in RUNNING_STATUSES and manuscript_id not in running:
        status = finished_status(page)
        manuscript.save_page(manuscript_id, user_id, {"status": status})
        errors[manuscript_id] = "The pipeline was interrupted."
    return ManuscriptProgress(
        manuscript_id=manuscript_id,
        status=status,
        transcription=page.get("transcription"),
        translation=page.get("translation"),
        summary=page.get("summary"),
        error=errors.get(manuscript_id),
    )
