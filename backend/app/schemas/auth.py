from pydantic import BaseModel, Field, field_validator

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72
PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"


class RegistrationRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: str = Field(
        min_length=3,
        max_length=320,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    password: str = Field(
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
    )

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, full_name: str) -> str:
        full_name = full_name.strip()
        if not full_name:
            raise ValueError("Full name cannot be empty or whitespace.")
        return full_name

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
