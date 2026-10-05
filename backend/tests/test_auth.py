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
