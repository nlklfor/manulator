from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase_auth.errors import AuthApiError

from app.schemas.auth import LoginResponse
from app.services.auth import authenticate_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/", response_model=LoginResponse)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> LoginResponse:
    try:
        response = authenticate_user(form_data.username, form_data.password)
    except AuthApiError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # no session means the account cannot log in yet, e.g. an unconfirmed email
    if response.session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return LoginResponse(
        success=True,
        jwtToken=response.session.access_token,
        tokenType="bearer",
        username=form_data.username,
    )
