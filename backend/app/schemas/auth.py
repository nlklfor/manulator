from pydantic import BaseModel


class LoginResponse(BaseModel):
    success: bool
    jwtToken: str | None
    tokenType: str | None
    username: str | None


class MessageResponse(BaseModel):
    success: bool
    message: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str
