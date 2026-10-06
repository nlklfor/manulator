from supabase_auth import AuthResponse

from app.config import settings
from app.services.database import get_supabase_client


# Authenticate the user with Supabase using the provided username and password.
# Returns an AuthResponse object containing the authentication result.
def authenticate_user(username: str, password: str) -> AuthResponse:
    supabase = get_supabase_client()
    return supabase.auth.sign_in_with_password(
        {"email": username, "password": password}
    )


# Create a new user account with Supabase using the provided display name, email, password
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
