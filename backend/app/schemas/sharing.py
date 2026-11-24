from datetime import datetime

from pydantic import BaseModel


# Body of POST /upload-manuscripts/{id}/share
class ShareRequest(BaseModel):
    username: str


# The copy that was created in the recipient's library
class ShareResponse(BaseModel):
    id: str  # id of the new manuscript (the recipient's copy)
    username: str  # the recipient, normalised (lowercase)


# Returned once, right after a link is created: the token is never stored,
# so the full url cannot be shown again later
class ShareLinkCreated(BaseModel):
    id: str
    url: str  # <frontend>/share/<token>
    expires_at: datetime


# An active link in the owner's list (without the url, see above)
class ShareLink(BaseModel):
    id: str
    expires_at: datetime
    created_at: datetime
    use_count: int


# What the recipient sees before adding the manuscript to their library
class ShareLinkPreview(BaseModel):
    title: str
    document_type: str
    page_count: int
    shared_by_username: str | None  # None if the owner has no username yet
    is_owner: bool  # True when the owner opens their own link


class AcceptResponse(BaseModel):
    id: str  # id of the new manuscript (the recipient's copy)
