import json
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services import manuscript
from tests.conftest import MANUSCRIPT_ID, OTHER_USERS_MANUSCRIPT_ID

URL = "/api/upload-manuscripts"


def upload(client, filename, data, content_type, title="Letter", doc_type="Religious"):
    return client.post(
        URL,
        files={"file": (filename, data, content_type)},
        data={"title": title, "document_type": doc_type},
    )


def test_upload_saves_manuscript_and_file(client, fake_supabase):
    response = upload(client, "page.png", b"png bytes", "image/png")

    assert response.status_code == 201  # 201 = created
    manuscript = fake_supabase.tables["manuscripts"][-1]
    page = fake_supabase.tables["manuscript_files"][-1]

    assert response.json()["id"] == manuscript["id"]  # used to delete it later
    assert manuscript["owner_id"] == "user-1"
    assert manuscript["title"] == "Letter"
    assert manuscript["document_type"] == "Religious"
    assert page["manuscript_id"] == manuscript["id"]  # file linked to manuscript
    assert page["file_name"] == "page.png"
    assert page["position"] == 1
    assert fake_supabase.files[page["storage_path"]] == b"png bytes"


def test_upload_pdf(client, fake_supabase):
    response = upload(client, "book.pdf", b"pdf bytes", "application/pdf")

    assert response.status_code == 201
    assert fake_supabase.tables["manuscript_files"][-1]["storage_path"].endswith(".pdf")


def test_rejects_empty_title_or_type(client, saved_files):
    assert upload(client, "a.png", b"png", "image/png", title=" ").status_code == 422
    assert upload(client, "a.png", b"png", "image/png", doc_type="").status_code == 422
    assert saved_files == {}  # 422 = missing or invalid form field


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


def test_list_returns_only_own_manuscripts(client, fake_supabase):
    response = client.get(URL)

    assert response.status_code == 200
    manuscripts = response.json()
    assert [m["id"] for m in manuscripts] == [MANUSCRIPT_ID]  # not user-2's
    assert manuscripts[0]["title"] == "Letter"
    assert manuscripts[0]["filename"] == "page.png"
    assert manuscripts[0]["status"] == "uploaded"
    assert manuscripts[0]["url"] == "https://temporary-link/user-1/manuscripts/page.png"


def test_list_requires_login():
    response = TestClient(app).get(URL)

    assert response.status_code in (401, 403)  # not logged in


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


def test_load_manuscript_pages(fake_supabase):
    page = manuscript.load_manuscript_pages(MANUSCRIPT_ID, "user-1")

    assert (page.file_name, page.content_type, page.image_bytes) == (
        "page.png",
        "image/png",
        b"png bytes",
    )


# Replaces the ML service: every request goes to `handler` instead of the network.
# Returns the list of requests the backend sent, so tests can check them.
@pytest.fixture
def fake_ml_service(monkeypatch):
    requests = []
    responses: dict[str, Any] = {"handler": None}
    real_client = httpx.AsyncClient

    def handle(request):
        requests.append(request)
        return responses["handler"](request)

    def client_with_fake_transport(*args, **kwargs):
        return real_client(*args, transport=httpx.MockTransport(handle), **kwargs)

    monkeypatch.setattr(manuscript.httpx, "AsyncClient", client_with_fake_transport)

    def respond_with(handler):
        responses["handler"] = handler
        return requests

    return respond_with


ML_RESULT = {
    "manuscript_id": MANUSCRIPT_ID,
    "overlay": "data:image/jpeg;base64,anBn",  # b"jpg" in base64
    "data": {"Detect Lines": {"lines": [{"index": 0, "bbox": [0, 0, 10, 5]}]}},
}

PLAN = {
    "manuscript_id": MANUSCRIPT_ID,
    "user_id": "user-1",
    "steps": None,
    "plan": "Detect Lines",
    "options": None,
}

ML_URL = "/api/process-manuscripts"


def test_process_manuscript(client, fake_supabase, fake_ml_service):
    requests = fake_ml_service(lambda request: httpx.Response(200, json=ML_RESULT))

    response = client.put(f"{ML_URL}/{MANUSCRIPT_ID}", json=PLAN)

    assert response.status_code == 200
    assert response.json() == ML_RESULT

    # The backend sends the stored page and the plan to the ML service
    [sent] = requests
    assert sent.method == "POST"
    assert str(sent.url) == f"{settings.ml_service_url}/api/process-manuscripts/"
    body = sent.read()
    assert b'filename="page.png"' in body
    assert b"Content-Type: image/png" in body
    assert b"png bytes" in body
    assert b'name="process_plan"' in body
    plan_json = json.dumps(
        {
            "manuscript_id": MANUSCRIPT_ID,
            "steps": [],
            "plan": "Detect Lines",
            "options": {},
        }
    ).encode()
    assert plan_json in body


def test_process_manuscript_ml_service_fails(client, fake_supabase, fake_ml_service):
    fake_ml_service(lambda request: httpx.Response(500, json={"detail": "boom"}))

    response = client.put(f"{ML_URL}/{MANUSCRIPT_ID}", json=PLAN)

    assert response.status_code == 502  # 502 = the ML service behind us failed


def test_process_manuscript_ml_service_unreachable(
    client, fake_supabase, fake_ml_service
):
    def not_running(request):
        raise httpx.ConnectError("connection refused", request=request)

    fake_ml_service(not_running)

    response = client.put(f"{ML_URL}/{MANUSCRIPT_ID}", json=PLAN)

    assert response.status_code == 502


def test_process_other_users_manuscript_is_not_found(
    client, fake_supabase, fake_ml_service
):
    # user_id in the body is ignored: only the logged-in user counts
    requests = fake_ml_service(lambda request: httpx.Response(200, json=ML_RESULT))
    plan = {**PLAN, "manuscript_id": OTHER_USERS_MANUSCRIPT_ID, "user_id": "user-2"}

    response = client.put(f"{ML_URL}/{OTHER_USERS_MANUSCRIPT_ID}", json=plan)

    assert response.status_code == 404
    assert requests == []  # the file is never sent to the ML service
