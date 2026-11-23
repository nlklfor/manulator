import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
    OAuth2PasswordRequestForm,
)
from postgrest import APIError
from supabase_auth.errors import AuthApiError, AuthError

from app.schemas.auth import (
    LoginResponse,
    LogoutResponse,
    RegistrationRequest,
    RegistrationResponse,
)
from app.services.auth import (
    authenticate_user,
    is_username_taken,
    register_user,
    sign_out_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Reads "Authorization: Bearer <token>"; auto_error=False lets us answer with 401
bearer_scheme = HTTPBearer(auto_error=False)

DUPLICATE_EMAIL_DETAIL = "An account with this email already exists."
USERNAME_TAKEN_DETAIL = "This username is already taken."


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


@router.post("/logout", response_model=LogoutResponse)
def logout(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> LogoutResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        sign_out_user(credentials.credentials)
    except AuthApiError as error:
        # Supabase rejects tokens that are invalid or already expired
        if error.status in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Logout service is temporarily unavailable.",
        ) from error
    except AuthError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Logout service is temporarily unavailable.",
        ) from error

    return LogoutResponse(success=True, message="Successfully logged out")


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(request: RegistrationRequest) -> RegistrationResponse:
    # request.username is already trimmed, lowercase and valid (see the schema)
    try:
        taken = is_username_taken(request.username)
    except APIError as error:
        logger.warning("Username lookup failed: %s", error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Registration service is temporarily unavailable.",
        ) from error
    if taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=USERNAME_TAKEN_DETAIL
        )

    try:
        response = register_user(
            request.display_name, request.email, request.password, request.username
        )
    except AuthApiError as error:
        logger.warning(
            "Supabase sign up failed: status=%s, code=%s, message=%s",
            error.status,
            error.code,
            error.message,
        )
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
