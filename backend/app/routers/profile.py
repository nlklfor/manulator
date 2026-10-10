from fastapi import APIRouter, Depends, UploadFile

from app.schemas.profile import ProfileResponse
from app.services import profile
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/profile", tags=["profile"])


# Upload a new profile picture, returns the updated profile
@router.post("/avatar", response_model=ProfileResponse)
def upload_avatar(file: UploadFile, user_id: str = Depends(get_current_user_id)):
    return profile.set_avatar(file, user_id)


# Remove the profile picture, returns the updated profile
@router.delete("/avatar", response_model=ProfileResponse)
def delete_avatar(user_id: str = Depends(get_current_user_id)):
    return profile.remove_avatar(user_id)
