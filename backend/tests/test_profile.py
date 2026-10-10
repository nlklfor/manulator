import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from postgrest.exceptions import APIError

from app.main import app
from app.services import bucket
from app.services import profile as profile_service

URL = "/api/profile/avatar"
PUBLIC = "https://project.supabase.co/storage/v1/object/public/avatars"


def image_bytes(fmt="PNG", size=(64, 64)):
    out = io.BytesIO()
    Image.new("RGB", size, "red").save(out, fmt)
    return out.getvalue()


# Fake Supabase with one profile row and a public avatars bucket
@pytest.fixture
def supabase(monkeypatch):
    state = {
        "row": {
            "id": "user-1",
            "email": "alice@example.com",
            "display_name": "Alice",
            "avatar_url": None,
            "created_at": "2026-10-01T10:00:00+00:00",
        },
        "files": {},
        "removed": [],
        "fail_on": None,  # "select" or "update": that database query fails
    }

    class FakeBucket:
        def __init__(self, name):
            self.name = name

        def upload(self, path, data, options):
            state["files"][f"{self.name}/{path}"] = data

        def get_public_url(self, path):
            return f"{PUBLIC}/{path}"

        def remove(self, paths):
            state["removed"].extend(paths)

    class FakeQuery:
        def __init__(self):
            self.changes = None

        def select(self, columns):
            return self

        def update(self, changes):
            self.changes = changes
            return self

        def eq(self, column, value):
            self.match = value == state["row"]["id"]
            return self

        def execute(self):
            kind = "update" if self.changes is not None else "select"
            if state["fail_on"] == kind:
                raise APIError({"message": "permission denied", "code": "42501"})
            if not self.match:
                return type("Response", (), {"data": []})
            if self.changes is not None:
                state["row"].update(self.changes)
            return type("Response", (), {"data": [dict(state["row"])]})

    class FakeSupabase:
        class storage:
            from_ = FakeBucket

        def table(self, name):
            return FakeQuery()

    monkeypatch.setattr(bucket, "get_admin_client", FakeSupabase)
    monkeypatch.setattr(profile_service, "get_admin_client", FakeSupabase)
    return state


def upload(client, data, content_type="image/png", filename="me.png"):
    return client.post(URL, files={"file": (filename, data, content_type)})


def test_upload_avatar_saves_link_in_profile(client, supabase):
    response = upload(client, image_bytes())

    assert response.status_code == 200
    body = response.json()
    assert body["avatar_url"].startswith(f"{PUBLIC}/user-1/avatar/")
    assert body["avatar_url"].endswith(".webp")
    assert body["email"] == "alice@example.com"
    assert supabase["row"]["avatar_url"] == body["avatar_url"]
    assert len(supabase["files"]) == 1


def test_new_avatar_deletes_old_file(client, supabase):
    supabase["row"]["avatar_url"] = f"{PUBLIC}/user-1/avatar/old.png"

    upload(client, image_bytes())

    assert supabase["removed"] == ["user-1/avatar/old.png"]


def test_never_deletes_other_users_files(client, supabase):
    supabase["row"]["avatar_url"] = f"{PUBLIC}/user-2/avatar/theirs.png"

    upload(client, image_bytes())

    assert supabase["removed"] == []


def test_big_photo_is_resized_to_webp(client, supabase):
    upload(client, image_bytes("JPEG", (4000, 3000)), "image/jpeg", "photo.jpg")

    saved = Image.open(io.BytesIO(next(iter(supabase["files"].values()))))
    assert saved.format == "WEBP"
    assert saved.size == (profile_service.AVATAR_SIZE, 384)  # keeps the 4:3 shape


def test_png_keeps_transparent_background(client, supabase):
    transparent = io.BytesIO()
    Image.new("RGBA", (64, 64), (255, 0, 0, 0)).save(transparent, "PNG")

    upload(client, transparent.getvalue())

    saved = Image.open(io.BytesIO(next(iter(supabase["files"].values()))))
    assert saved.format == "WEBP"
    assert saved.mode == "RGBA"


def test_rejects_unsupported_type(client, supabase):
    response = upload(client, b"%PDF-1.7", "application/pdf", "cv.pdf")

    assert response.status_code == 415
    assert supabase["files"] == {}


def test_rejects_file_that_is_not_an_image(client, supabase):
    response = upload(client, b"<html>not a picture</html>", "image/png")

    assert response.status_code == 400
    assert supabase["files"] == {}


def test_rejects_wrong_image_format(client, supabase):
    # a JPEG sent as PNG
    response = upload(client, image_bytes("JPEG"), "image/png")

    assert response.status_code == 400


def test_rejects_too_large_file(client, supabase, monkeypatch):
    monkeypatch.setattr(profile_service, "MAX_AVATAR_MB", 0)

    response = upload(client, image_bytes())

    assert response.status_code == 413
    assert supabase["files"] == {}


def test_remove_avatar(client, supabase):
    supabase["row"]["avatar_url"] = f"{PUBLIC}/user-1/avatar/old.png"

    response = client.delete(URL)

    assert response.status_code == 200
    assert response.json()["avatar_url"] is None
    assert supabase["removed"] == ["user-1/avatar/old.png"]


def test_requires_login(supabase):
    not_logged_in = TestClient(app)

    assert upload(not_logged_in, image_bytes()).status_code in (401, 403)
    assert not_logged_in.delete(URL).status_code in (401, 403)
    assert supabase["files"] == {}


def test_database_error_before_upload_saves_nothing(client, supabase):
    supabase["fail_on"] = "select"

    response = upload(client, image_bytes())

    assert response.status_code == 502  # readable error instead of a crash
    assert supabase["files"] == {}  # nothing was uploaded


def test_database_error_after_upload_removes_new_file(client, supabase):
    supabase["fail_on"] = "update"

    response = upload(client, image_bytes())

    assert response.status_code == 502
    uploaded = next(iter(supabase["files"]))  # "avatars/<path>"
    assert supabase["removed"] == [uploaded.split("/", 1)[1]]
    assert supabase["row"]["avatar_url"] is None
