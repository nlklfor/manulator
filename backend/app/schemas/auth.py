from pydantic import BaseModel


class LoginResponse(BaseModel):
    success: bool
    jwtToken: str|None
    username: str|None
