import base64
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.schemas.manuscripts import ManuscriptProcessResponse, ManuscriptProcessPlan
from services.pipeline import Task, Pipeline

router = APIRouter(prefix="/process-manuscripts", tags=["manuscripts"])

@router.post("/", response_model=ManuscriptProcessResponse)
def process_manuscript(process_plan: Annotated[str, Form()], file: Annotated[UploadFile, File()]):
    # check if file has correct format
    if not file or file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file format")
    try:
        # validate the process plan
        # check whether the process plan is valid JSON and
        # matches the ManuscriptProcessPlan schema
        plan = ManuscriptProcessPlan.model_validate_json(process_plan)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors()) from error

    # read the file content
    content = file.file.read()

    # create the task
    task = Task(input=plan.plan, data={"image": content, "image_id": plan.manuscript_id},
                options=plan.options)
    # create the pipeline and run it
    pipeline = Pipeline(task)
    result = pipeline.run()
    if not result["Detect Lines"]:
        raise HTTPException(status_code=500, detail="ML pipeline failed to detect lines")
    segmentation = result["Detect Lines"]
    # read the overlay image from the segmentation result
    overlay_bytes = Path(segmentation["image_path"]).read_bytes()
    # convert the overlay image to base64
    overlay = "data:image/jpeg;base64," + base64.b64encode(overlay_bytes).decode()

    return ManuscriptProcessResponse(
        manuscript_id=plan.manuscript_id,
        overlay=overlay,
        data={step: {k: v for k, v in r.items() if k != "image_path"} for step, r in result.items()},
    )



