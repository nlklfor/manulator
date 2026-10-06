from app.config import settings
from app.services.database import get_supabase_client


# Ask Supabase to email the user a link to reset their password
def send_password_reset_email(email: str) -> None:
    supabase = get_supabase_client()
    supabase.auth.reset_password_for_email(
        email, {"redirect_to": f"{settings.frontend_url}/reset-password"}
    )


# Save a new password for the user who clicked the reset link.
# The access token from that link tells Supabase who the user is.
def reset_password(access_token: str, new_password: str) -> None:
    supabase = get_supabase_client()
    user = supabase.auth.get_user(access_token).user
    supabase.auth.admin.update_user_by_id(user.id, {"password": new_password})
