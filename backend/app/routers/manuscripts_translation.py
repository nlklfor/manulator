from uuid import UUID

from fastapi import APIRouter, Depends

from app.schemas.manuscript import ManuscriptTranslationResponse, TranslationPlan
from app.services import manuscript
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/translate-manuscripts", tags=["manuscripts"])


@router.post("/{manuscript_id}", response_model=ManuscriptTranslationResponse)
async def translate_manuscript(
    manuscript_id: UUID,
    translation_plan: TranslationPlan,
    user_id: str = Depends(get_current_user_id),
):
    # translate the manuscript with the given id for the current user
    return await manuscript.translate_manuscript(
        str(manuscript_id), translation_plan, user_id
    )
