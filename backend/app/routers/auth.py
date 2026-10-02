from datetime import timedelta, timezone, datetime

from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends

from app.schemas.auth import LoginResponse
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt


SECRET_KEY = 'mysecretkey'
ALGORITHM = "HS256"

router = APIRouter(prefix="/auth", tags=["auth"])

dummy_user = {
    "username": "testuser@user.ch",
    "password": "testpassword"
}



def authenticate_user(username: str, password: str) -> bool:
    return username == dummy_user["username"] and password == dummy_user["password"]

def create_access_token(username: str, expires_delta: timedelta, user_id: int) -> str:
    encode = {'sub': username, 'id': user_id}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp': expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/", response_model=LoginResponse)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> LoginResponse:
    print(form_data.username, form_data.password)
    if authenticate_user(form_data.username, form_data.password):
        # In a real application, you would generate a JWT token here
        jwt_token = create_access_token(username = form_data.username, user_id=1, expires_delta=timedelta(minutes=20))

        return LoginResponse(success=True, jwtToken=jwt_token, username=form_data.username, tokenType='bearer')

    return LoginResponse(success=False, jwtToken=None, username=None, tokenType=None)