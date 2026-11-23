import pytest
from fastapi.testclient import TestClient
from postgrest import APIError

from app.main import app
from app.services import manuscript
from tests.conftest import MANUSCRIPT_ID, OTHER_USERS_MANUSCRIPT_ID

URL = "/api/upload-manuscripts"


def line_url(manuscript_id=MANUSCRIPT_ID, index=1):
    return f"{URL}/{manuscript_id}/lines/{index}"


# Both pages are transcribed with two lines, each with its position on the scan
@pytest.fixture
def transcribed(fake_supabase):
    for page in fake_supabase.tables["manuscript_files"]:
        page["status"] = "transcribed"
        page["transcription"] = [
            {"index": 0, "text": "In nomine", "bbox": [0, 0, 10, 5]},
            {"index": 1, "text": "dornini nostri", "bbox": [0, 6, 10, 11]},
        ]
    return fake_supabase


def test_correction_is_saved_and_returned(client, transcribed):
    response = client.patch(line_url(), json={"text": "domini nostri"})

    assert response.status_code == 200
    assert response.json() == {
        "manuscript_id": MANUSCRIPT_ID,
        "index": 1,
        "text": "domini nostri",
        "original_text": "dornini nostri",
        "status": "corrected",
    }
    # Same index and region, the new text, and the model's reading kept beside it
    [entry] = client.get(URL).json()
    assert entry["status"] == "corrected"
    assert entry["transcription"] == [
        {"index": 0, "text": "In nomine", "bbox": [0, 0, 10, 5]},
        {
            "index": 1,
            "text": "domini nostri",
            "bbox": [0, 6, 10, 11],
            "original_text": "dornini nostri",
        },
    ]


def test_second_correction_keeps_the_models_reading(client, transcribed):
    client.patch(line_url(), json={"text": "domini nostri"})
    response = client.patch(line_url(), json={"text": "Domini nostri"})

    assert response.json()["original_text"] == "dornini nostri"
    line = transcribed.tables["manuscript_files"][0]["transcription"][1]
    assert line["text"] == "Domini nostri"
    assert line["original_text"] == "dornini nostri"


def test_line_set_back_to_the_models_reading_is_not_corrected(client, transcribed):
    client.patch(line_url(), json={"text": "domini nostri"})
    response = client.patch(line_url(), json={"text": "dornini nostri"})

    assert response.json()["original_text"] is None
    line = transcribed.tables["manuscript_files"][0]["transcription"][1]
    assert line == {"index": 1, "text": "dornini nostri", "bbox": [0, 6, 10, 11]}


def test_rejects_empty_text(client, transcribed):
    response = client.patch(line_url(), json={"text": "   "})

    assert response.status_code == 422
    assert transcribed.tables["manuscript_files"][0]["status"] == "transcribed"


def test_requires_login(transcribed):
    response = TestClient(app).patch(line_url(), json={"text": "domini"})

    assert response.status_code == 401


def test_other_users_manuscript_is_not_found(client, transcribed):
    response = client.patch(
        line_url(OTHER_USERS_MANUSCRIPT_ID), json={"text": "Hacked"}
    )

    assert response.status_code == 404
    others_page = transcribed.tables["manuscript_files"][1]
    assert others_page["transcription"][1]["text"] == "dornini nostri"


def test_database_failure_is_reported(client, transcribed, monkeypatch):
    class BrokenDatabase:
        @staticmethod
        def table(_name):
            raise APIError({"message": "connection lost"})

    monkeypatch.setattr(manuscript, "get_admin_client", BrokenDatabase)

    response = client.patch(line_url(), json={"text": "domini nostri"})

    assert response.status_code == 502
