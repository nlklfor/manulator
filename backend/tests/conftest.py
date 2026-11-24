from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from storage3.utils import StorageException

from app.config import settings
from app.main import app
from app.services import bucket, manuscript, sharing, storage
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


# Fake Supabase: database tables and Storage files held in memory.
# Deleting a manuscript also deletes its file rows and share links,
# like the real foreign keys do.
# Set fake_supabase.fail_copy_number = n to make the n-th Storage copy fail.
@pytest.fixture
def fake_supabase(monkeypatch):
    fake = SimpleNamespace(fail_copy_number=None, copy_count=0)
    tables: dict[str, list[dict]] = {
        "profiles": [
            {"id": "user-1", "username": "alice"},
            {"id": "user-2", "username": "bob"},
            {"id": "user-3", "username": None},  # an old account without a name
        ],
        "manuscript_share_links": [],
        "manuscripts": [
            {
                "id": MANUSCRIPT_ID,
                "owner_id": "user-1",
                "title": "Letter",
                "document_type": "Religious",
                "created_at": "2026-01-01T10:00:00+00:00",
            },
            {
                "id": OTHER_USERS_MANUSCRIPT_ID,
                "owner_id": "user-2",
                "title": "Secret",
                "document_type": "Political",
                "created_at": "2026-01-01T10:00:00+00:00",
            },
        ],
        "manuscript_files": [
            {
                "id": "file-1",
                "manuscript_id": MANUSCRIPT_ID,
                "owner_id": "user-1",
                "file_name": "page.png",
                "storage_path": "user-1/manuscripts/page.png",
                "content_type": "image/png",
                "size_bytes": 9,
                "position": 1,
                "status": "uploaded",
            },
            {
                "id": "file-2",
                "manuscript_id": OTHER_USERS_MANUSCRIPT_ID,
                "owner_id": "user-2",
                "file_name": "page.png",
                "storage_path": "user-2/manuscripts/page.png",
                "content_type": "image/png",
                "size_bytes": 9,
                "position": 1,
                "status": "uploaded",
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
            self.new_row = None
            self.changes = None
            self.filters = {}
            self.in_filters = {}
            self.sort = None

        def insert(self, row):
            # id and created_at are filled in by the real database
            self.new_row = {
                "id": str(uuid4()),
                "created_at": "2026-01-02T10:00:00+00:00",
                **row,
            }
            if self.name == "manuscript_share_links":  # defaults of the real table
                self.new_row.setdefault("use_count", 0)
                self.new_row.setdefault("revoked_at", None)
            return self

        def select(self, *_):
            return self

        def update(self, changes):
            self.changes = changes
            return self

        def delete(self):
            self.is_delete = True
            return self

        def eq(self, column, value):
            self.filters[column] = value
            return self

        def in_(self, column, values):
            self.in_filters[column] = values
            return self

        def order(self, column, desc=False):
            self.sort = (column, desc)
            return self

        def execute(self):
            rows = tables[self.name]
            if self.new_row:
                rows.append(self.new_row)
                return SimpleNamespace(data=[self.new_row])
            matching = [
                row
                for row in rows
                if all(row.get(c) == v for c, v in self.filters.items())
                and all(row.get(c) in v for c, v in self.in_filters.items())
            ]
            for row in matching:
                row.update(self.changes or {})
            if self.is_delete:
                rows[:] = [row for row in rows if row not in matching]
                if self.name == "manuscripts":
                    deleted = [m["id"] for m in matching]
                    for child in ("manuscript_files", "manuscript_share_links"):
                        tables[child][:] = [
                            row
                            for row in tables[child]
                            if row["manuscript_id"] not in deleted
                        ]
            if self.sort:
                column, desc = self.sort
                matching.sort(key=lambda row: row[column], reverse=desc)
            return SimpleNamespace(data=matching)

    class FakeBucket:
        def download(self, path):
            return stored_files[path]

        def upload(self, path, data, options):
            stored_files[path] = data

        def copy(self, from_path, to_path):
            fake.copy_count += 1
            if (
                fake.copy_count == fake.fail_copy_number
                or from_path not in stored_files
            ):
                raise StorageException({"message": "copy failed"})
            stored_files[to_path] = stored_files[from_path]
            return {"path": to_path}

        def create_signed_url(self, path, seconds):
            return {"signedUrl": f"https://temporary-link/{path}"}

        def create_signed_urls(self, paths, seconds):
            return [
                {"path": path, "signedUrl": f"https://temporary-link/{path}"}
                for path in paths
            ]

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
    monkeypatch.setattr(sharing, "get_admin_client", FakeSupabase)
    fake.tables = tables
    fake.files = stored_files
    return fake
