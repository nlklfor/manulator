from pydantic import BaseModel, Field, field_validator

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72
PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"


class RegistrationRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=50)
    email: str = Field(
        min_length=3,
        max_length=320,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    password: str = Field(
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
    )

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, display_name: str) -> str:
        display_name = display_name.strip()
        if not display_name:
            raise ValueError("Display name cannot be empty or whitespace.")
        return display_name

    @field_validator("password")
    @classmethod
    def validate_password(cls, password: str) -> str:
        if not any(char.isupper() for char in password):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(char.islower() for char in password):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not any(char.isdigit() for char in password):
            raise ValueError("Password must contain at least one digit.")
        if not any(char in PASSWORD_SPECIAL_CHARACTERS for char in password):
            raise ValueError(
                "Password must contain at least one special character: "
                + PASSWORD_SPECIAL_CHARACTERS
            )
        return password


class RegistrationResponse(BaseModel):
    success: bool


class LoginResponse(BaseModel):
    success: bool
    jwtToken: str | None
    tokenType: str | None
    username: str | None


class LogoutResponse(BaseModel):
    success: bool
    message: str
