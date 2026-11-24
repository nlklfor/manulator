import re

from pydantic import BaseModel, Field, field_validator

# Usernames: 3-30 characters, only a-z, 0-9 and _ (the same rule as the database CHECK)
USERNAME_PATTERN = re.compile(r"^[a-z0-9_]{3,30}$")
USERNAME_RULES = "Username must be 3 to 30 characters: a-z, 0-9 or _."

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72
PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"


# Usernames are stored in lowercase, so "Alice" and "alice" are the same name.
def normalize_username(username: str) -> str:
    return username.strip().lower()


class RegistrationRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=50)
    username: str
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

    # Trimmed and lowercased first, then checked; an invalid name gives 422
    @field_validator("username")
    @classmethod
    def validate_username(cls, username: str) -> str:
        username = normalize_username(username)
        if not USERNAME_PATTERN.fullmatch(username):
            raise ValueError(USERNAME_RULES)
        return username

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
