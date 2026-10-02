from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends

from app.schemas.auth import LoginResponse
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth", tags=["auth"])

dummy_user = {
    "username": "testuser@user.ch",
    "password": "testpassword"
}


def authenticate_user(username: str, password: str) -> bool:
    return username == dummy_user["username"] and password == dummy_user["password"]

@router.post("/")
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> LoginResponse:
    print(form_data.username, form_data.password)
    if authenticate_user(form_data.username, form_data.password):
        # In a real application, you would generate a JWT token here
        jwt_token = "dummy-jwt-token"
        print(jwt_token)
        return LoginResponse(success=True, jwtToken=jwt_token, username=form_data.username)
    return LoginResponse(success=False, jwtToken=None, username=None)