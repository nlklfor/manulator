from uuid import UUID

from fastapi import APIRouter, Depends

from app.schemas.manuscript import ManuscriptSummaryResponse
from app.services import manuscript
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/summarize-manuscripts", tags=["manuscripts"])


# Summarizes the saved translation of the manuscript (it must be translated first)
@router.post("/{manuscript_id}", response_model=ManuscriptSummaryResponse)
async def summarize_manuscript(
    manuscript_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    return await manuscript.summarize_manuscript(str(manuscript_id), user_id)
