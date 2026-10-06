from fastapi import APIRouter, HTTPException, status
from supabase_auth.errors import AuthApiError, AuthWeakPasswordError

from app.schemas.password import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
)
from app.services.password import reset_password, send_password_reset_email

# same /auth prefix so the URLs stay the same:
# /api/auth/forgot-password and /api/auth/reset-password
router = APIRouter(prefix="/auth", tags=["password"])


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(request: ForgotPasswordRequest) -> MessageResponse:
    send_password_reset_email(request.email)
    return MessageResponse(
        success=True,
        message="If an account exists for this email, we sent you a reset link.",
    )


@router.post("/reset-password", response_model=MessageResponse)
def set_new_password(request: ResetPasswordRequest) -> MessageResponse:
    try:
        reset_password(request.access_token, request.new_password)
    except AuthWeakPasswordError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password is too weak. Please choose a stronger one.",
        )
    except AuthApiError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired.",
        )

    return MessageResponse(success=True, message="Your password has been changed.")
