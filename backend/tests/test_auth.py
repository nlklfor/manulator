from datetime import datetime, timezone
from unittest.mock import Mock

import pytest
from _pytest.monkeypatch import MonkeyPatch
from supabase_auth import AuthResponse, Session, User
from supabase_auth.errors import AuthApiError

from app.services import auth

URL = "/api/auth/"
EMAIL = "user@example.com"
PASSWORD = "test-password"


@pytest.fixture
def supabase_client(monkeypatch: MonkeyPatch):
    client = Mock(spec=["auth"])
    client.auth = Mock(spec=["sign_in_with_password"])
    monkeypatch.setattr(auth, "get_supabase_client", Mock(return_value=client))
    return client


@pytest.fixture
def auth_user():
    return User(
        id="00000000-0000-0000-0000-000000000001",
        email=EMAIL,
        app_metadata={},
        user_metadata={},
        aud="authenticated",
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


def test_login_success(client, supabase_client, auth_user):
    session = Session(
        access_token="test-access-token",
        refresh_token="test-refresh-token",
        token_type="bearer",
        expires_in=3600,
        user=auth_user,
    )
    supabase_client.auth.sign_in_with_password.return_value = AuthResponse(
        user=auth_user, session=session
    )

    response = client.post(URL, data={"username": EMAIL, "password": PASSWORD})

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "jwtToken": session.access_token,
        "tokenType": "bearer",
        "username": EMAIL,
    }
    supabase_client.auth.sign_in_with_password.assert_called_once_with(
        {"email": EMAIL, "password": PASSWORD}
    )


def test_login_rejects_invalid_credentials(client, supabase_client):
    supabase_client.auth.sign_in_with_password.side_effect = AuthApiError(
        "Invalid login credentials", 400, "invalid_credentials"
    )

    response = client.post(URL, data={"username": EMAIL, "password": "wrong-password"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password"}
    supabase_client.auth.sign_in_with_password.assert_called_once_with(
        {"email": EMAIL, "password": "wrong-password"}
    )


def test_login_rejects_missing_session(client, supabase_client, auth_user):
    supabase_client.auth.sign_in_with_password.return_value = AuthResponse(
        user=auth_user, session=None
    )

    response = client.post(URL, data={"username": EMAIL, "password": PASSWORD})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password"}
    supabase_client.auth.sign_in_with_password.assert_called_once_with(
        {"email": EMAIL, "password": PASSWORD}
    )


@pytest.mark.parametrize(
    ("data", "missing_fields"),
    [
        ({"password": PASSWORD}, {"username"}),
        ({"username": EMAIL}, {"password"}),
        ({}, {"username", "password"}),
    ],
)
def test_login_requires_credentials(client, supabase_client, data, missing_fields):
    response = client.post(URL, data=data)

    assert response.status_code == 422
    assert {error["loc"][-1] for error in response.json()["detail"]} == missing_fields
    supabase_client.auth.sign_in_with_password.assert_not_called()
