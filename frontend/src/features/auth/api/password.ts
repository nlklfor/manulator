import { apiFetch } from "@/lib/api/client";

interface MessageResponse {
  success: boolean;
  message: string;
}

function postJson(path: string, body: object) {
  return apiFetch<MessageResponse>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Supabase emails the user a link to /reset-password#access_token=...
export function sendResetLink(email: string) {
  return postJson("/api/auth/forgot-password", { email });
}

export function resetPassword(accessToken: string, newPassword: string) {
  return postJson("/api/auth/reset-password", {
    access_token: accessToken,
    new_password: newPassword,
  });
}
