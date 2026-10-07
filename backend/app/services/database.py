from functools import lru_cache

from supabase import create_client

from app.config import settings


# Shared client for admin work (for example setting a new password).
# lru_cache is used to cache the Supabase client instance,
# so it is only created once and reused for subsequent calls.
# Never log a user in with this client: see get_supabase_client below.
@lru_cache(maxsize=1)
def get_admin_client():
    return create_client(settings.supabase_url, settings.supabase_secret_key)


# A new client for every login or sign up. Signing in switches a client
# from the secret key to that user's token, so a client used for login
# must not be shared with the admin work above.
def get_supabase_client():
    return create_client(settings.supabase_url, settings.supabase_secret_key)
