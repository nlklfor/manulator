from fastapi.testclient import TestClient

from app.main import app
from app.routers import manuscripts
from services.classification import Classification

client = TestClient(app)


def test_classify_returns_page_metadata(monkeypatch):
    # Fake the Claude call so the test needs no API key
    fake = Classification(century="13th century", script="Gothic textualis",
                          language="Latin", region="France", document_type="codex")
    monkeypatch.setattr(manuscripts, "classify_page", lambda image, media_type: fake)

    response = client.post("/api/process-manuscripts/classify",
                           files={"file": ("page.png", b"img", "image/png")})

    assert response.status_code == 200
    assert response.json()["century"] == "13th century"


def test_classify_rejects_wrong_format():
    response = client.post("/api/process-manuscripts/classify",
                           files={"file": ("page.txt", b"x", "text/plain")})

    assert response.status_code == 415
