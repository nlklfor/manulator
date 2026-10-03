from functools import lru_cache

from supabase import Client, create_client
from supabase_auth import AuthResponse

from app.config import settings

# @lru_cache is used to cache the Supabase client instance, so it is only created once and reused for subsequent calls.
# This improves performance by avoiding repeated client creation.
@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_secret_key)


def authenticate_user(username: str, password: str) -> AuthResponse:
    supabase = get_supabase_client()
    return supabase.auth.sign_in_with_password(
        {"email": username, "password": password}
    )
