import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

export interface ShareResponse {
  id: string; // id of the recipient's copy
  username: string; // the recipient, in lowercase
}

// Sends a copy of the manuscript to another user. It appears in their library straight away.
// Throws an ApiError: 404 unknown username, 400 yourself, 409 still transcribing.
export async function shareWithUser(
  manuscriptId: string,
  username: string,
): Promise<ShareResponse> {
  return apiFetch<ShareResponse>(
    `/api/upload-manuscripts/${encodeURIComponent(manuscriptId)}/share`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    },
  );
}
