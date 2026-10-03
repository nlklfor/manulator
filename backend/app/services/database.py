from functools import lru_cache
from supabase import create_client
from app.config import settings

# lru_cache is used to cache the Supabase client instance, so it is only created once and reused for subsequent calls.
@lru_cache(maxsize=1)
def get_supabase_client():
    return create_client(settings.supabase_url, settings.supabase_secret_key)