from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from services import summarization
from services.summarization import Summary

client = TestClient(app)


def test_summarize_sends_the_text_to_the_model(monkeypatch):
    # Fake the model call, so the test needs no model and no API key
    seen = {}

    def fake_ask(prompt, answer_type, image=None):
        seen["prompt"] = prompt
        return Summary(summary="A charter of 1291 in which the abbess of Säckingen sells a field.")
    monkeypatch.setattr(summarization, "get_model", lambda choice: (fake_ask, "fake"))

    response = client.post("/api/process-manuscripts/summarize",
                           json={"text": "  We, the abbess of Säckingen, sell a field...  "})

    assert response.status_code == 200
    assert response.json() == {"summary": "A charter of 1291 in which the abbess of Säckingen sells a field."}
    assert seen["prompt"].endswith("We, the abbess of Säckingen, sell a field...")


def test_summarize_rejects_empty_text():
    response = client.post("/api/process-manuscripts/summarize", json={"text": "   "})

    assert response.status_code == 422


def test_summarize_reports_unknown_model(monkeypatch):
    monkeypatch.setattr(settings, "classifier_model", "nosuch-model")

    response = client.post("/api/process-manuscripts/summarize", json={"text": "Some text"})

    assert response.status_code == 502
    assert "Unknown model" in response.json()["detail"]
