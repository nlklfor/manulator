from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import MANUSCRIPT_ID, OTHER_USERS_MANUSCRIPT_ID

URL = "/api/upload-manuscripts"


def upload(client, filename, data, content_type):
    return client.post(URL, files={"file": (filename, data, content_type)})


def test_upload_png(client, fake_supabase):
    response = upload(client, "page 2.png", b"png bytes", "image/png")

    assert response.status_code == 201  # 201 = created
    body = response.json()
    manuscript = fake_supabase.tables["manuscripts"][-1]
    page = fake_supabase.tables["manuscript_files"][-1]

    assert body["id"] == manuscript["id"]  # the id the frontend uses to delete it
    assert manuscript["owner_id"] == "user-1"
    assert manuscript["title"] == "page 2"
    assert page["file_name"] == "page 2.png"
    assert fake_supabase.files[page["storage_path"]] == b"png bytes"
    assert body["url"] == f"https://temporary-link/{page['storage_path']}"


def test_upload_pdf(client, fake_supabase):
    response = upload(client, "book.pdf", b"pdf bytes", "application/pdf")

    assert response.status_code == 201
    assert fake_supabase.tables["manuscript_files"][-1]["storage_path"].endswith(".pdf")


def test_list_my_manuscripts(client, fake_supabase):
    response = client.get(URL)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": MANUSCRIPT_ID,
            "title": "Letter",
            "created_at": "2026-10-01T10:00:00Z",
            "files": [
                {
                    "file_name": "page.png",
                    "content_type": "image/png",
                    "size": 9,
                    "url": "https://temporary-link/user-1/manuscripts/page.png",
                }
            ],
        }
    ]  # only user-1's manuscript, never user-2's


def test_list_shows_new_upload(client, fake_supabase):
    upload(client, "new.png", b"png bytes", "image/png")

    titles = [m["title"] for m in client.get(URL).json()]
    assert "new" in titles


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
