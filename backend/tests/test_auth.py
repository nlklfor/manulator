from datetime import datetime, timezone
from unittest.mock import Mock

import pytest
from _pytest.monkeypatch import MonkeyPatch
from supabase_auth import AuthResponse, Session, User, UserIdentity
from supabase_auth.errors import AuthApiError, AuthRetryableError

from app.config import settings
from app.services import auth

URL = "/api/auth/"
REGISTER_URL = "/api/auth/register"
EMAIL = "user@example.com"
PASSWORD = "Test-password1"
FULL_NAME = "Test User"

DUPLICATE_EMAIL_RESPONSE = {"detail": "An account with this email already exists."}
UNAVAILABLE_RESPONSE = {"detail": "Registration service is temporarily unavailable."}


def registration_payload(**overrides):
    payload = {"full_name": FULL_NAME, "email": EMAIL, "password": PASSWORD}
    payload.update(overrides)
    return payload


def expected_sign_up_call(full_name: str = FULL_NAME):
    return {
        "email": EMAIL,
        "password": PASSWORD,
        "options": {
            "data": {"full_name": full_name},
            "email_redirect_to": f"{settings.frontend_url}/auth",
        },
    }


@pytest.fixture
def supabase_client(monkeypatch: MonkeyPatch):
    client = Mock(spec=["auth"])
    client.auth = Mock(spec=["sign_in_with_password", "sign_up"])
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


@pytest.fixture
def new_user(auth_user):
    identity = UserIdentity.model_construct(
        id=auth_user.id, user_id=auth_user.id, provider="email"
    )
    return auth_user.model_copy(update={"identities": [identity]})


@pytest.fixture
def existing_user(auth_user):
    return auth_user.model_copy(update={"identities": []})


# LOGIN TESTS
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


# REGISTRATION TESTS
def test_registration_success(client, supabase_client, new_user):
    supabase_client.auth.sign_up.return_value = AuthResponse(
        user=new_user, session=None
    )

    response = client.post(REGISTER_URL, json=registration_payload())

    assert response.status_code == 201
    assert response.json() == {"success": True}
    supabase_client.auth.sign_up.assert_called_once_with(expected_sign_up_call())


def test_registration_trims_full_name(client, supabase_client, new_user):
    supabase_client.auth.sign_up.return_value = AuthResponse(
        user=new_user, session=None
    )

    response = client.post(
        REGISTER_URL, json=registration_payload(full_name="  Test User  ")
    )

    assert response.status_code == 201
    supabase_client.auth.sign_up.assert_called_once_with(
        expected_sign_up_call(full_name="Test User")
    )


def test_registration_rejects_duplicate_email_without_identites(
    client, supabase_client, existing_user
):
    supabase_client.auth.sign_up.return_value = AuthResponse(
        user=existing_user, session=None
    )

    response = client.post(REGISTER_URL, json=registration_payload())

    assert response.status_code == 409
    assert response.json() == DUPLICATE_EMAIL_RESPONSE
    supabase_client.auth.sign_up.assert_called_once()


@pytest.mark.parametrize("code", ["user_already_exists", "email_exists"])
def test_registration_rejects_duplicate_email_error(client, supabase_client, code):
    supabase_client.auth.sign_up.side_effect = AuthApiError(
        "User already registered", 422, code
    )

    response = client.post(REGISTER_URL, json=registration_payload())

    assert response.status_code == 409
    assert response.json() == DUPLICATE_EMAIL_RESPONSE
    supabase_client.auth.sign_up.assert_called_once()


def test_registration_hides_provider_validation_details(client, supabase_client):
    supabase_client.auth.sign_up.side_effect = AuthApiError(
        "Password too short", 400, "weak_password"
    )

    response = client.post(REGISTER_URL, json=registration_payload())

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Registration could not be completed. Check the email and password."
    }
    assert "Password too short" not in response.text


def test_registration_reports_rate_limit(client, supabase_client):
    supabase_client.auth.sign_up.side_effect = AuthApiError(
        "Email rate limit exceeded", 429, "over_email_send_rate_limit"
    )

    response = client.post(REGISTER_URL, json=registration_payload())

    assert response.status_code == 429
    assert response.json() == {
        "detail": "Too many registration attempts. Please try again later."
    }


def test_registration_reports_provider_server_error(client, supabase_client):
    supabase_client.auth.sign_up.side_effect = AuthApiError(
        "Internal server error", 500, "unexpected_failure"
    )

    response = client.post(REGISTER_URL, json=registration_payload())

    assert response.status_code == 502
    assert response.json() == UNAVAILABLE_RESPONSE


def test_registration_reports_network_error(client, supabase_client):
    supabase_client.auth.sign_up.side_effect = AuthRetryableError(
        "Connection timed out", 0
    )

    response = client.post(REGISTER_URL, json=registration_payload())

    assert response.status_code == 502
    assert response.json() == UNAVAILABLE_RESPONSE


@pytest.mark.parametrize(
    ("data", "invalid_field"),
    [
        # full name
        ({"email": EMAIL, "password": PASSWORD}, "full_name"),
        (registration_payload(full_name=""), "full_name"),
        (registration_payload(full_name="   "), "full_name"),
        (registration_payload(full_name="a" * 101), "full_name"),
        # email
        ({"full_name": FULL_NAME, "password": PASSWORD}, "email"),
        (registration_payload(email=""), "email"),
        (registration_payload(email="abc"), "email"),
        (registration_payload(email="user@example"), "email"),
        # password
        ({"full_name": FULL_NAME, "email": EMAIL}, "password"),
        (registration_payload(password=""), "password"),
        (registration_payload(password="Ab1!"), "password"),
        (registration_payload(password="Aa1!" + "a" * 69), "password"),
        (registration_payload(password="test-password1"), "password"),
        (registration_payload(password="TEST-PASSWORD1"), "password"),
        (registration_payload(password="Test-password"), "password"),
        (registration_payload(password="Testpassword1"), "password"),
    ],
)
def test_registration_validates_input(client, supabase_client, data, invalid_field):
    response = client.post(REGISTER_URL, json=data)

    assert response.status_code == 422
    assert {error["loc"][-1] for error in response.json()["detail"]} == {invalid_field}
    supabase_client.auth.sign_up.assert_not_called()
