from uuid import UUID

from fastapi import APIRouter, Depends

from app.schemas.manuscript import ManuscriptProcessPlan, ManuscriptTranscriptResponse
from app.services import manuscript
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/process-manuscripts", tags=["manuscripts"])


@router.post("/{manuscript_id}", response_model=ManuscriptTranscriptResponse)
async def process_manuscript(
    manuscript_id: UUID,
    plan: ManuscriptProcessPlan,
    user_id: str = Depends(get_current_user_id),
):
    plan.manuscript_id = str(manuscript_id)
    # process the manuscript using the provided plan and user_id
    return await manuscript.process_manuscript(plan, user_id)
