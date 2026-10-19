from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services import bucket, manuscript, storage
from app.services.auth import get_current_user_id

MANUSCRIPT_ID = "11111111-1111-4111-8111-111111111111"
OTHER_USERS_MANUSCRIPT_ID = "22222222-2222-4222-8222-222222222222"


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


# Fake Supabase for deleting: database tables and Storage files held in memory.
# Deleting a manuscript also deletes its file rows, like the real foreign key does.
@pytest.fixture
def fake_supabase(monkeypatch):
    tables = {
        "manuscripts": [
            {"id": MANUSCRIPT_ID, "owner_id": "user-1"},
            {"id": OTHER_USERS_MANUSCRIPT_ID, "owner_id": "user-2"},
        ],
        "manuscript_files": [
            {
                "manuscript_id": MANUSCRIPT_ID,
                "owner_id": "user-1",
                "storage_path": "user-1/manuscripts/page.png",
                "file_name": "page.png",
                "content_type": "image/png",
            },
            {
                "manuscript_id": OTHER_USERS_MANUSCRIPT_ID,
                "owner_id": "user-2",
                "storage_path": "user-2/manuscripts/page.png",
            },
        ],
    }
    stored_files = {
        "user-1/manuscripts/page.png": b"png bytes",
        "user-2/manuscripts/page.png": b"png bytes",
    }

    class FakeQuery:
        def __init__(self, name):
            self.name = name
            self.is_delete = False
            self.filters = {}

        def select(self, *_):
            return self

        def delete(self):
            self.is_delete = True
            return self

        def eq(self, column, value):
            self.filters[column] = value
            return self

        def order(self, _column):
            return self

        def execute(self):
            rows = tables[self.name]
            matching = [
                row for row in rows if all(row[c] == v for c, v in self.filters.items())
            ]
            if self.is_delete:
                rows[:] = [row for row in rows if row not in matching]
                if self.name == "manuscripts":
                    tables["manuscript_files"][:] = [
                        f
                        for f in tables["manuscript_files"]
                        if f["manuscript_id"] not in [m["id"] for m in matching]
                    ]
            return SimpleNamespace(data=matching)

    class FakeBucket:
        def download(self, path):
            return stored_files[path]

        def remove(self, paths):
            removed = [path for path in paths if stored_files.pop(path, None)]
            return [{"name": path} for path in removed]

    class FakeSupabase:
        class storage:
            @staticmethod
            def from_(_name):
                return FakeBucket()

        @staticmethod
        def table(name):
            return FakeQuery(name)

    monkeypatch.setattr(bucket, "get_admin_client", FakeSupabase)
    monkeypatch.setattr(storage, "get_admin_client", FakeSupabase)
    monkeypatch.setattr(manuscript, "get_admin_client", FakeSupabase)
    return SimpleNamespace(tables=tables, files=stored_files)
