from supabase_auth import AuthResponse

from app.services.database import get_supabase_client


# Authenticate the user with Supabase using the provided username and password.
# Returns an AuthResponse object containing the authentication result.
def authenticate_user(username: str, password: str) -> AuthResponse:
    supabase = get_supabase_client()
    return supabase.auth.sign_in_with_password(
        {"email": username, "password": password}
    )
