from supabase_auth.errors import AuthApiError, AuthWeakPasswordError

from app.routers import auth

URL = "/api/auth/forgot-password"


def test_forgot_password_sends_email(client, monkeypatch):
    sent_to = []

    def fake_send(email):
        sent_to.append(email)

    monkeypatch.setattr(auth, "send_password_reset_email", fake_send)

    response = client.post(URL, json={"email": "isabelle@example.com"})

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert sent_to == ["isabelle@example.com"]


RESET_URL = "/api/auth/reset-password"


def test_reset_password_saves_new_password(client, monkeypatch):
    calls = []

    def fake_reset(access_token, new_password):
        calls.append((access_token, new_password))

    monkeypatch.setattr(auth, "reset_password", fake_reset)

    response = client.post(
        RESET_URL, json={"access_token": "abc123", "new_password": "NewPass123"}
    )

    assert response.status_code == 200
    assert calls == [("abc123", "NewPass123")]


def test_reset_password_rejects_invalid_link(client, monkeypatch):
    def fake_reset(access_token, new_password):
        raise AuthApiError("Invalid token", 401, None)

    monkeypatch.setattr(auth, "reset_password", fake_reset)

    response = client.post(
        RESET_URL, json={"access_token": "expired", "new_password": "NewPass123"}
    )

    assert response.status_code == 400


def test_reset_password_rejects_weak_password(client, monkeypatch):
    def fake_reset(access_token, new_password):
        raise AuthWeakPasswordError("Password is too weak", 422, ["length"])

    monkeypatch.setattr(auth, "reset_password", fake_reset)

    response = client.post(
        RESET_URL, json={"access_token": "abc123", "new_password": "a"}
    )

    assert response.status_code == 400
    assert "too weak" in response.json()["detail"]
