from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase_auth.errors import AuthApiError, AuthWeakPasswordError

from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginResponse,
    MessageResponse,
    ResetPasswordRequest,
)
from app.services.auth import (
    authenticate_user,
    reset_password,
    send_password_reset_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/", response_model=LoginResponse)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> LoginResponse:
    try:
        response = authenticate_user(form_data.username, form_data.password)
    except AuthApiError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # no session means the account cannot log in yet, e.g. an unconfirmed email
    if response.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return LoginResponse(
        success=True,
        jwtToken=response.session.access_token,
        tokenType="bearer",
        username=form_data.username,
    )


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
