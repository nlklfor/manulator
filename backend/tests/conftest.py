import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services import bucket
from app.services.auth import get_current_user_id


# Test client logged in as "user-1", with a 1 MB upload limit
@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    app.dependency_overrides[get_current_user_id] = lambda: "user-1"
    yield TestClient(app)
    app.dependency_overrides.clear()


# Fake Supabase Storage: uploaded files land in this dict as {"bucket/path": bytes}
@pytest.fixture
def saved_files(monkeypatch):
    files = {}

    class FakeBucket:
        def __init__(self, name):
            self.name = name

        def upload(self, path, data, options):
            files[f"{self.name}/{path}"] = data

        def create_signed_url(self, path, seconds):
            return {"signedUrl": f"https://temporary-link/{path}"}

        def get_public_url(self, path):
            return f"https://permanent-link/{path}"

    class FakeSupabase:
        class storage:
            from_ = FakeBucket

    monkeypatch.setattr(bucket, "get_admin_client", FakeSupabase)
    return files
