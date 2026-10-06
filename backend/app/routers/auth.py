from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase_auth.errors import AuthApiError, AuthError

from app.schemas.auth import LoginResponse, RegistrationRequest, RegistrationResponse
from app.services.auth import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])

DUPLICATE_EMAIL_DETAIL = "An account with this email already exists."


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


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(request: RegistrationRequest) -> RegistrationResponse:
    try:
        response = register_user(request.full_name, request.email, request.password)
    except AuthApiError as error:
        if error.code in {"user_already_exists", "email_exists"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=DUPLICATE_EMAIL_DETAIL,
            ) from error
        if error.status == status.HTTP_429_TOO_MANY_REQUESTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many registration attempts. Please try again later.",
            ) from error
        if error.status < status.HTTP_500_INTERNAL_SERVER_ERROR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Registration could not be completed. Check the email and password."
                ),
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Registration service is temporarily unavailable.",
        ) from error
    except AuthError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Registration service is temporarily unavailable.",
        ) from error

    if response.user is not None and not response.user.identities:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=DUPLICATE_EMAIL_DETAIL,
        )

    return RegistrationResponse(success=True)
