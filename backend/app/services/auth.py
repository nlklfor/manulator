from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase_auth import AuthResponse
from supabase_auth.errors import AuthError

from app.config import settings
from app.services.database import get_admin_client, get_supabase_client

bearer = HTTPBearer()


# Authenticate the user with Supabase using the provided username and password.
# Returns an AuthResponse object containing the authentication result.
def authenticate_user(username: str, password: str) -> AuthResponse:
    supabase = get_supabase_client()
    return supabase.auth.sign_in_with_password(
        {"email": username, "password": password}
    )


# Create a new user account with Supabase using the provided
# display name, email, and password
# Returns an AuthResponse object containing the registration result.
def register_user(display_name: str, email: str, password: str) -> AuthResponse:
    supabase = get_supabase_client()
    return supabase.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {
                "data": {"display_name": display_name},
                "email_redirect_to": f"{settings.frontend_url}/auth",
            },
        }
    )


# Return the id of the logged-in user from the "Authorization: Bearer <token>" header.
# Use in a route: user_id: str = Depends(get_current_user_id)
def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> str:
    try:
        token = get_admin_client().auth.get_claims(credentials.credentials)
    except AuthError:
        token = None

    if token is None or "sub" not in token["claims"]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.")
    return token["claims"]["sub"]
# End the Supabase session that belongs to the given access token.
# "local" only ends this session, so the user stays logged in on other devices.
# Supabase revokes the refresh token; the access token itself stays valid
# until it expires, which is why the frontend also deletes it.
def sign_out_user(access_token: str) -> None:
    supabase = get_supabase_client()
    supabase.auth.admin.sign_out(access_token, "local")
