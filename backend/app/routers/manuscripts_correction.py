from uuid import UUID

from fastapi import APIRouter, Depends

from app.schemas.manuscript import (
    ManuscriptCorrectionPlan,
    ManuscriptCorrectionResponse,
)
from app.services import manuscript
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/correct-manuscripts", tags=["manuscripts"])


@router.post("/{manuscript_id}", response_model=ManuscriptCorrectionResponse)
async def correct_manuscript(
    manuscript_id: UUID,
    correction_plan: ManuscriptCorrectionPlan,
    user_id: str = Depends(get_current_user_id),
):
    # correct the manuscript with the given id for the current user
    return await manuscript.correct_manuscript(
        str(manuscript_id), correction_plan, user_id
    )
