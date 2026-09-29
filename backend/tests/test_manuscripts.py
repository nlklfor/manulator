from app.config import settings

URL = "/api/upload-manuscripts"


def test_upload_png(client):
    response = client.post(URL, files={"file": ("page.png", b"PNG data", "image/png")})
    assert response.status_code == 201
    body = response.json()
    assert body["filename"] == "page.png"
    assert body["content_type"] == "image/png"
    assert body["size"] == 8
    assert (settings.upload_dir / f"{body['id']}.png").read_bytes() == b"PNG data"


def test_rejects_unsupported_type(client):
    response = client.post(URL, files={"file": ("notes.txt", b"hi", "text/plain")})
    assert response.status_code == 415


def test_rejects_too_large(client):
    too_big = b"0" * (1024 * 1024 + 1)
    response = client.post(URL, files={"file": ("big.png", too_big, "image/png")})
    assert response.status_code == 413
    assert list(settings.upload_dir.glob("*")) == []
