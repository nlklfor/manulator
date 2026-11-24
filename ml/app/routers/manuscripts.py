import base64
import mimetypes
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import UnidentifiedImageError
from pydantic import ValidationError

from app.config import settings
from app.schemas.manuscripts import ManuscriptProcessResponse, ManuscriptProcessPlan, ManuscriptTranslationResponse, \
    TranslationPlan, ManuscriptCorrectionResponse, ManuscriptCorrectionPlan
from services.classification import Classification, classify_page
from services.pipeline import Task, Pipeline

router = APIRouter(prefix="/process-manuscripts", tags=["manuscripts"])


@router.post("/classify", response_model=Classification)
def classify_manuscript(file: Annotated[UploadFile, File()]):
    # The model is set in ml/.env (CLASSIFIER_MODEL), see services/classification.py
    # Any image is accepted (e.g. TIFF from the CLaMM dataset): it is turned into JPEG if the model needs it
    content_type = image_type(file)
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Invalid file format")
    limit = settings.max_upload_mb * 1024 * 1024
    image = file.file.read(limit + 1)
    if len(image) > limit:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit")
    try:
        return classify_page(image, content_type)
    except UnidentifiedImageError as error:
        raise HTTPException(status_code=422, detail="Could not read the image") from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Classification failed: {error}") from error


def image_type(file: UploadFile) -> str:
    """The file's type, or (if none was sent, e.g. curl with a .tif) guessed from the file name."""
    if file.content_type and file.content_type != "application/octet-stream":
        return file.content_type
    return mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"


@router.post("/", response_model=ManuscriptProcessResponse)
def process_manuscript(process_plan: Annotated[str, Form()], file: Annotated[UploadFile, File()]):
    # check if file has correct format
    # PDFs are not supported yet: Kraken can only open images
    if file.content_type == "application/pdf":
        raise HTTPException(status_code=415, detail="PDFs are not supported yet")
    if not image_type(file).startswith("image/"):  # Kraken reads any image Pillow can open
        raise HTTPException(status_code=415, detail="Invalid file format")

    limit = settings.max_upload_mb * 1024 * 1024
    file_data = file.file.read(limit + 1)
    size = len(file_data)
    if size > limit:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit")
    try:
        # validate the process plan
        # check whether the process plan is valid JSON and
        # matches the ManuscriptProcessPlan schema
        plan = ManuscriptProcessPlan.model_validate_json(process_plan)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors()) from error

    # create the task
    task = Task(input=plan.plan, data={"image": file_data, "image_id": plan.manuscript_id},
                options=plan.options)
    # create the pipeline and run it
    pipeline = Pipeline(task)
    # only steps that are implemented in the pipeline can be run
    if plan.plan not in pipeline.actions:
        raise HTTPException(status_code=400, detail=f"Unknown step: {plan.plan}")
    result = pipeline.run()
    if not result["Detect Lines"]:
        raise HTTPException(status_code=500, detail="ML pipeline failed to detect lines")
    segmentation = result["Detect Lines"]
    # read the overlay image from the segmentation result
    overlay_bytes = Path(segmentation["image_path"]).read_bytes()
    # convert the overlay image to base64
    overlay = "data:image/jpeg;base64," + base64.b64encode(overlay_bytes).decode()

    return ManuscriptProcessResponse(
        success=True if result[plan.plan] is not None else False,
        manuscript_id=plan.manuscript_id,
        overlay=overlay,
        data={step: {k: v for k, v in r.items() if k != "image_path"} for step, r in result.items()},
        message="Processing completed successfully" if result[plan.plan] else "Processing failed"
    )

@router.post("/correct", response_model=ManuscriptCorrectionResponse)
def correct_manuscript(correction_plan: ManuscriptCorrectionPlan):
    plan = correction_plan.plan
    if plan != "Correct":
        raise HTTPException(status_code=400, detail=f"Unknown step: {plan}")

    # create the correction task for the pipeline
    task = Task(input=plan, data={"lines": correction_plan.lines},
                    options={"skip_dependencies": True, "type": correction_plan.type})

    # create the pipeline and run it
    pipeline = Pipeline(task)
    if plan not in pipeline.actions:
        raise HTTPException(status_code=400, detail=f"Unknown action: {plan}")

    result = pipeline.run()

    # Note: No confidence values are added yet
    return ManuscriptCorrectionResponse(
        manuscript_id=correction_plan.manuscript_id,
        corrected_lines=result[plan],
        success=True if result[plan] is not None else False,
        message="Correction completed successfully" if result[plan] else "Correction failed"
    )


@router.post("/translate", response_model=ManuscriptTranslationResponse)
def translate_manuscript(translation_plan: TranslationPlan) -> ManuscriptTranslationResponse:
    plan = translation_plan.plan

    # create the translation task
    task = Task(input=plan, data={"lines": translation_plan.lines},
                options={"target_language": translation_plan.target_language,
                         "skip_dependencies": True, "type": translation_plan.type})

    # create the pipeline and run it
    pipeline = Pipeline(task)

    if plan not in pipeline.actions:
        raise HTTPException(status_code=400, detail=f"Unknown step: {plan}")

    result = pipeline.run()

    return ManuscriptTranslationResponse(
        manuscript_id=translation_plan.manuscript_id,
        translated_lines=result[plan],
        success=True if result[plan] is not None else False,
        message="Translation completed successfully" if result[plan] else "Translation failed"
    )
