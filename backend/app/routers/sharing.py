from uuid import UUID

from fastapi import APIRouter, Depends

from app.schemas.sharing import (
    AcceptResponse,
    ShareLink,
    ShareLinkCreated,
    ShareLinkPreview,
    ShareRequest,
    ShareResponse,
)
from app.services import sharing
from app.services.auth import get_current_user_id

router = APIRouter(tags=["sharing"])


# Share by username: the recipient gets a copy in their library straight away.
# 404 unknown username or not your manuscript, 400 yourself, 409 while transcribing
@router.post(
    "/upload-manuscripts/{manuscript_id}/share",
    response_model=ShareResponse,
    status_code=201,
)
def share_with_user(
    manuscript_id: UUID,
    request: ShareRequest,
    user_id: str = Depends(get_current_user_id),
):
    return sharing.share_with_user(str(manuscript_id), user_id, request.username)


# Creates a link that is valid for 24 hours. The url is only shown in this answer.
@router.post(
    "/upload-manuscripts/{manuscript_id}/share-links",
    response_model=ShareLinkCreated,
    status_code=201,
)
def create_share_link(manuscript_id: UUID, user_id: str = Depends(get_current_user_id)):
    return sharing.create_share_link(str(manuscript_id), user_id)


# The owner's active (not expired, not revoked) links for one manuscript
@router.get(
    "/upload-manuscripts/{manuscript_id}/share-links",
    response_model=list[ShareLink],
)
def list_share_links(manuscript_id: UUID, user_id: str = Depends(get_current_user_id)):
    return sharing.list_share_links(str(manuscript_id), user_id)


# What the recipient sees before adding the manuscript. Needs login.
@router.get("/share-links/{token}", response_model=ShareLinkPreview)
def preview_share_link(token: str, user_id: str = Depends(get_current_user_id)):
    return sharing.preview_share_link(token, user_id)


# Adds a copy of the linked manuscript to the logged-in user's library
@router.post(
    "/share-links/{token}/accept", response_model=AcceptResponse, status_code=201
)
def accept_share_link(token: str, user_id: str = Depends(get_current_user_id)):
    return sharing.accept_share_link(token, user_id)


# Revokes a link; only the person who created it can do this
@router.delete("/share-links/{link_id}", status_code=204)
def revoke_share_link(
    link_id: UUID, user_id: str = Depends(get_current_user_id)
) -> None:
    sharing.revoke_share_link(str(link_id), user_id)
