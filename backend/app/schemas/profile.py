from datetime import datetime

from pydantic import BaseModel


# The profile row as the frontend reads it (same columns as in profile.ts)
class ProfileResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    avatar_url: str | None
    created_at: datetime | None = None
