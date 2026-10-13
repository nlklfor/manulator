from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import MANUSCRIPT_ID, OTHER_USERS_MANUSCRIPT_ID

URL = "/api/upload-manuscripts"


def upload(client, filename, data, content_type):
    return client.post(URL, files={"file": (filename, data, content_type)})


def test_upload_png(client, saved_files):
    response = upload(client, "page.png", b"png bytes", "image/png")

    assert response.status_code == 201  # 201 = created
    body = response.json()
    assert body["filename"] == "page.png"
    assert body["id"].startswith("user-1/manuscripts/")
    assert body["url"] == f"https://temporary-link/{body['id']}"
    assert saved_files == {f"uploads/{body['id']}": b"png bytes"}


def test_upload_pdf(client, saved_files):
    response = upload(client, "book.pdf", b"pdf bytes", "application/pdf")

    assert response.status_code == 201
    assert response.json()["id"].endswith(".pdf")


def test_rejects_unsupported_type(client, saved_files):
    response = upload(client, "notes.txt", b"hello", "text/plain")

    assert response.status_code == 415  # 415 = file type not allowed
    assert saved_files == {}


def test_rejects_too_large_file(client, saved_files):
    too_big = b"0" * (1024 * 1024 + 1)  # 1 byte over the 1 MB test limit
    response = upload(client, "big.png", too_big, "image/png")

    assert response.status_code == 413  # 413 = file too large
    assert saved_files == {}


def test_requires_login(saved_files):
    not_logged_in = TestClient(app)
    response = upload(not_logged_in, "page.png", b"png bytes", "image/png")

    assert response.status_code in (401, 403)  # not logged in
    assert saved_files == {}


def test_delete_manuscript(client, fake_supabase):
    response = client.delete(f"{URL}/{MANUSCRIPT_ID}")

    assert response.status_code == 204  # 204 = done, nothing to return
    remaining = [m["id"] for m in fake_supabase.tables["manuscripts"]]
    assert MANUSCRIPT_ID not in remaining
    # The file row is deleted with the manuscript, and so is the file in Storage
    assert [f["manuscript_id"] for f in fake_supabase.tables["manuscript_files"]] == [
        OTHER_USERS_MANUSCRIPT_ID
    ]
    assert "user-1/manuscripts/page.png" not in fake_supabase.files


def test_delete_with_wrong_id_deletes_nothing(client, fake_supabase):
    unknown_id = "33333333-3333-4333-8333-333333333333"

    for wrong_id in (unknown_id, OTHER_USERS_MANUSCRIPT_ID):
        response = client.delete(f"{URL}/{wrong_id}")
        assert response.status_code == 404  # 404 = not found (or not yours)

    assert len(fake_supabase.tables["manuscripts"]) == 2
    assert len(fake_supabase.tables["manuscript_files"]) == 2
    assert len(fake_supabase.files) == 2
