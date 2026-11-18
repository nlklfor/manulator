from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.routers import manuscripts
from services.classification import Classification

client = TestClient(app)


def test_classify_returns_page_metadata(monkeypatch):
    # Fake the model call, so the test needs no model and no API key
    fake = Classification(century="13th century", script="Textualis",
                          language="Latin", region="France", document_type="Book")
    monkeypatch.setattr(manuscripts, "classify_page", lambda image, media_type: fake)

    response = client.post("/api/process-manuscripts/classify",
                           files={"file": ("page.png", b"img", "image/png")})

    assert response.status_code == 200
    assert response.json()["century"] == "13th century"


def test_classify_rejects_wrong_format():
    response = client.post("/api/process-manuscripts/classify",
                           files={"file": ("page.txt", b"x", "text/plain")})

    assert response.status_code == 415


def test_classify_reports_unknown_model(monkeypatch):
    # A wrong CLASSIFIER_MODEL in ml/.env gives a clear error, not a crash
    monkeypatch.setattr(settings, "classifier_model", "nosuch-model")

    response = client.post("/api/process-manuscripts/classify",
                           files={"file": ("page.png", b"img", "image/png")})

    assert response.status_code == 502
    assert "Unknown model" in response.json()["detail"]


def test_classify_accepts_tiff(monkeypatch):
    # CLaMM images are TIFF: they are turned into JPEG before the model sees them
    import io
    from PIL import Image
    from services import classification
    seen = {}

    def fake_model(image, media_type):
        seen["media_type"] = media_type
        return Classification(century="9th century", script="Caroline", language="Latin",
                              region="France", document_type="Book")
    monkeypatch.setattr(classification, "get_classifier", lambda choice: (fake_model, "fake"))
    tiff = io.BytesIO()
    Image.new("L", (20, 20), 255).save(tiff, "TIFF")

    response = client.post("/api/process-manuscripts/classify",
                           files={"file": ("page.tif", tiff.getvalue(), "image/tiff")})

    assert response.status_code == 200
    assert seen["media_type"] == "image/jpeg"
