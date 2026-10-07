from pydantic import BaseModel


class MessageResponse(BaseModel):
    success: bool
    message: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str
