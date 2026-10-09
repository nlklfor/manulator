import io

import pytest
from PIL import Image

from app.services.bucket import MAX_IMAGE_SIDE, get_file_url, upload_file


def test_private_upload(saved_files):
    path, url = upload_file(b"pdf", "application/pdf", "user-1", "manuscripts")

    assert path.startswith("user-1/manuscripts/") and path.endswith(".pdf")
    assert saved_files == {f"uploads/{path}": b"pdf"}
    assert url == f"https://temporary-link/{path}"


def test_public_upload(saved_files):
    path, url = upload_file(b"png", "image/png", "user-1", "avatars", public=True)

    assert saved_files == {f"avatars/{path}": b"png"}
    assert url == f"https://permanent-link/{path}"


def test_get_file_url(saved_files):
    assert get_file_url("user-1/a.pdf") == "https://temporary-link/user-1/a.pdf"


def test_compress_big_photo(saved_files):
    photo = io.BytesIO()
    Image.effect_noise((4000, 3000), 100).convert("RGB").save(photo, "JPEG")

    upload_file(photo.getvalue(), "image/jpeg", "user-1", "avatars", compress=True)

    saved = next(iter(saved_files.values()))
    assert max(Image.open(io.BytesIO(saved)).size) == MAX_IMAGE_SIDE


def test_rejects_wrong_type(saved_files):
    with pytest.raises(ValueError):
        upload_file(b"<html>", "text/html", "user-1", "avatars")
    assert saved_files == {}


def test_rejects_other_users_folder(saved_files):
    with pytest.raises(ValueError):
        upload_file(b"png", "image/png", "../user-2", "avatars")
    assert saved_files == {}
