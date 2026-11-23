from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.config import settings
from app.main import app
from app.services import sharing
from app.services.auth import get_current_user_id
from tests.conftest import MANUSCRIPT_ID, OTHER_USERS_MANUSCRIPT_ID

SHARE_URL = f"/api/upload-manuscripts/{MANUSCRIPT_ID}/share"
LINKS_URL = f"/api/upload-manuscripts/{MANUSCRIPT_ID}/share-links"
NOT_FOUND = {"detail": "Manuscript or user not found."}
LINK_GONE = {"detail": "This link is no longer available."}


def log_in_as(user_id):
    app.dependency_overrides[get_current_user_id] = lambda: user_id


def transcribe(fake, overlay=True):
    page = fake.tables["manuscript_files"][0]
    page["status"] = "corrected"
    page["transcription"] = [{"index": 0, "text": "In nomine", "bbox": [1, 2, 3, 4]}]
    if overlay:
        page["overlay_path"] = "user-1/overlays/a.jpg"
        fake.files["user-1/overlays/a.jpg"] = b"overlay bytes"
    return page


def manuscripts_of(fake, user_id):
    return [m for m in fake.tables["manuscripts"] if m["owner_id"] == user_id]


def files_of(fake, manuscript_id):
    return [
        f
        for f in fake.tables["manuscript_files"]
        if f["manuscript_id"] == manuscript_id
    ]


# COPYING
def test_copy_creates_independent_copy_with_overlay(fake_supabase):
    original = transcribe(fake_supabase)

    new_id = sharing.copy_manuscript(MANUSCRIPT_ID, "user-1", "user-2")

    [copy] = [m for m in fake_supabase.tables["manuscripts"] if m["id"] == new_id]
    assert copy["owner_id"] == "user-2"
    assert copy["title"] == "Letter"
    assert copy["shared_by"] == "user-1"
    assert copy["shared_at"]
    [page] = files_of(fake_supabase, new_id)
    assert page["owner_id"] == "user-2"
    assert page["storage_path"].startswith(f"user-2/{new_id}/")
    assert page["storage_path"].endswith(".png")
    assert page["overlay_path"].startswith("user-2/overlays/")
    for column in ("file_name", "content_type", "size_bytes", "position", "status"):
        assert page[column] == original[column]
    assert page["transcription"] == original["transcription"]
    assert fake_supabase.files[page["storage_path"]] == b"png bytes"
    assert fake_supabase.files[page["overlay_path"]] == b"overlay bytes"


def test_copy_survives_deleting_the_original(client, fake_supabase):
    transcribe(fake_supabase)
    new_id = sharing.copy_manuscript(MANUSCRIPT_ID, "user-1", "user-2")

    assert client.delete(f"/api/upload-manuscripts/{MANUSCRIPT_ID}").status_code == 204

    [page] = files_of(fake_supabase, new_id)
    assert page["storage_path"] in fake_supabase.files
    assert page["overlay_path"] in fake_supabase.files


def test_copy_without_overlay(fake_supabase):
    transcribe(fake_supabase, overlay=False)

    new_id = sharing.copy_manuscript(MANUSCRIPT_ID, "user-1", "user-2")

    [page] = files_of(fake_supabase, new_id)
    assert page["overlay_path"] is None
    assert page["storage_path"] in fake_supabase.files


def test_copy_failing_halfway_removes_everything(fake_supabase):
    transcribe(fake_supabase)
    files_before = dict(fake_supabase.files)
    fake_supabase.fail_copy_number = 2  # the page is copied, the overlay fails

    with pytest.raises(HTTPException) as error:
        sharing.copy_manuscript(MANUSCRIPT_ID, "user-1", "user-2")

    assert error.value.status_code == 502
    assert manuscripts_of(fake_supabase, "user-2") == [
        m
        for m in fake_supabase.tables["manuscripts"]
        if m["id"] == OTHER_USERS_MANUSCRIPT_ID
    ]
    assert len(fake_supabase.tables["manuscript_files"]) == 2  # only the originals
    assert fake_supabase.files == files_before  # the copied page was removed again


def test_copy_of_someone_elses_manuscript_is_not_found(fake_supabase):
    with pytest.raises(HTTPException) as error:
        sharing.copy_manuscript(OTHER_USERS_MANUSCRIPT_ID, "user-1", "user-3")

    assert error.value.status_code == 404
    assert manuscripts_of(fake_supabase, "user-3") == []


def test_copy_while_transcribing_copies_nothing(fake_supabase):
    fake_supabase.tables["manuscript_files"][0]["status"] = "transcribing"

    with pytest.raises(HTTPException) as error:
        sharing.copy_manuscript(MANUSCRIPT_ID, "user-1", "user-3")

    assert error.value.status_code == 409
    assert manuscripts_of(fake_supabase, "user-3") == []


# SHARE BY USERNAME
def test_share_by_username(client, fake_supabase):
    response = client.post(SHARE_URL, json={"username": " Bob "})

    assert response.status_code == 201
    assert response.json()["username"] == "bob"
    new_id = response.json()["id"]
    assert [m["id"] for m in manuscripts_of(fake_supabase, "user-2")][-1] == new_id


def test_shared_copy_shows_who_shared_it(client, fake_supabase):
    new_id = client.post(SHARE_URL, json={"username": "bob"}).json()["id"]

    log_in_as("user-2")
    library = {m["id"]: m for m in client.get("/api/upload-manuscripts").json()}

    assert library[new_id]["shared_by_username"] == "alice"
    assert library[OTHER_USERS_MANUSCRIPT_ID]["shared_by_username"] is None


@pytest.mark.parametrize(
    ("url", "username"),
    [
        (SHARE_URL, "nobody"),  # unknown username
        (f"/api/upload-manuscripts/{OTHER_USERS_MANUSCRIPT_ID}/share", "user_3"),
    ],
)
def test_share_unknown_user_or_manuscript_gives_same_404(
    client, fake_supabase, url, username
):
    fake_supabase.tables["profiles"][2]["username"] = "user_3"

    response = client.post(url, json={"username": username})

    assert response.status_code == 404
    assert response.json() == NOT_FOUND


def test_share_with_yourself_is_rejected(client, fake_supabase):
    response = client.post(SHARE_URL, json={"username": "alice"})

    assert response.status_code == 400
    assert len(fake_supabase.tables["manuscripts"]) == 2  # nothing copied


def test_share_while_transcribing_is_rejected(client, fake_supabase):
    fake_supabase.tables["manuscript_files"][0]["status"] = "transcribing"

    response = client.post(SHARE_URL, json={"username": "bob"})

    assert response.status_code == 409
    assert response.json() == {"detail": "Wait until transcription has finished."}


# SHARE LINKS
def create_link(client):
    response = client.post(LINKS_URL)
    assert response.status_code == 201
    return response.json()


def token_of(link):
    return link["url"].rsplit("/", 1)[-1]


def test_create_link_stores_only_the_hash(client, fake_supabase):
    link = create_link(client)

    assert link["url"].startswith(f"{settings.frontend_url}/share/")
    [row] = fake_supabase.tables["manuscript_share_links"]
    assert row["token_hash"] == sharing.hash_token(token_of(link))
    assert token_of(link) not in str(row)
    expires = datetime.fromisoformat(link["expires_at"])
    assert timedelta(hours=23) < expires - datetime.now(UTC) <= timedelta(hours=24)


def test_create_link_for_someone_elses_manuscript_is_not_found(client, fake_supabase):
    response = client.post(
        f"/api/upload-manuscripts/{OTHER_USERS_MANUSCRIPT_ID}/share-links"
    )

    assert response.status_code == 404
    assert fake_supabase.tables["manuscript_share_links"] == []


def test_list_shows_only_active_links(client, fake_supabase):
    active = create_link(client)
    expired = create_link(client)
    revoked = create_link(client)
    rows = {row["id"]: row for row in fake_supabase.tables["manuscript_share_links"]}
    rows[expired["id"]]["expires_at"] = "2020-01-01T00:00:00+00:00"
    rows[revoked["id"]]["revoked_at"] = "2026-01-01T00:00:00+00:00"

    response = client.get(LINKS_URL)

    assert response.status_code == 200
    assert [link["id"] for link in response.json()] == [active["id"]]


def test_preview_link(client, fake_supabase):
    token = token_of(create_link(client))

    log_in_as("user-2")
    response = client.get(f"/api/share-links/{token}")

    assert response.status_code == 200
    assert response.json() == {
        "title": "Letter",
        "document_type": "Religious",
        "page_count": 1,
        "shared_by_username": "alice",
        "is_owner": False,
    }


def test_preview_own_link(client, fake_supabase):
    token = token_of(create_link(client))

    assert client.get(f"/api/share-links/{token}").json()["is_owner"] is True


def test_accept_link_copies_and_counts(client, fake_supabase):
    token = token_of(create_link(client))

    log_in_as("user-2")
    response = client.post(f"/api/share-links/{token}/accept")

    assert response.status_code == 201
    new_id = response.json()["id"]
    [copy] = [m for m in fake_supabase.tables["manuscripts"] if m["id"] == new_id]
    assert copy["owner_id"] == "user-2"
    assert copy["shared_by"] == "user-1"
    assert fake_supabase.tables["manuscript_share_links"][0]["use_count"] == 1


def test_owner_cannot_accept_own_link(client, fake_supabase):
    token = token_of(create_link(client))

    response = client.post(f"/api/share-links/{token}/accept")

    assert response.status_code == 400
    assert len(fake_supabase.tables["manuscripts"]) == 2


def expire(fake, link):
    fake.tables["manuscript_share_links"][0]["expires_at"] = "2020-01-01T00:00:00+00:00"


def revoke(fake, link):
    fake.tables["manuscript_share_links"][0]["revoked_at"] = "2026-01-01T00:00:00+00:00"


def delete_manuscript(fake, link):
    fake.tables["manuscripts"][:] = [
        m for m in fake.tables["manuscripts"] if m["id"] != MANUSCRIPT_ID
    ]
    fake.tables["manuscript_share_links"].clear()  # the foreign key cascade


@pytest.mark.parametrize("break_link", [expire, revoke, delete_manuscript])
def test_broken_links_give_the_same_404(client, fake_supabase, break_link):
    link = create_link(client)
    break_link(fake_supabase, link)

    log_in_as("user-2")
    preview = client.get(f"/api/share-links/{token_of(link)}")
    accept = client.post(f"/api/share-links/{token_of(link)}/accept")

    assert (preview.status_code, preview.json()) == (404, LINK_GONE)
    assert (accept.status_code, accept.json()) == (404, LINK_GONE)
    assert (
        manuscripts_of(fake_supabase, "user-2")[-1]["id"] == OTHER_USERS_MANUSCRIPT_ID
    )


def test_unknown_link_gives_the_same_404(client, fake_supabase):
    response = client.get("/api/share-links/not-a-real-token")

    assert (response.status_code, response.json()) == (404, LINK_GONE)


def test_revoke_link(client, fake_supabase):
    link = create_link(client)

    response = client.delete(f"/api/share-links/{link['id']}")

    assert response.status_code == 204
    assert client.get(LINKS_URL).json() == []


def test_only_the_creator_can_revoke(client, fake_supabase):
    link = create_link(client)

    log_in_as("user-2")
    response = client.delete(f"/api/share-links/{link['id']}")

    assert response.status_code == 404
    assert fake_supabase.tables["manuscript_share_links"][0]["revoked_at"] is None
