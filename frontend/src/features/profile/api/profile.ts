import { ApiError, apiFetch } from "@/lib/api/client";
import { clearAuthToken, getAuthToken, getTokenClaims } from "@/lib/auth/session";

// Where the Supabase project lives and the key that browsers may use.
// Both come from frontend/.env.local (see docs/database.md).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const COLUMNS = "id,email,display_name,avatar_url,created_at";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at?: string; // missing when the profile could not be loaded
}

async function profileRequest(init?: RequestInit): Promise<Profile> {
  const token = getAuthToken();
  const user = getTokenClaims();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase URL or key is missing in frontend/.env.local");
  }
  if (!token || !user) {
    throw new Error("Not logged in");
  }

  const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=${COLUMNS}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // ask for one object instead of a list, and for the row after an update
      Accept: "application/vnd.pgrst.object+json",
      Prefer: "return=representation",
    },
  });

  // 401 means the token has expired. Remove it and reload the page:
  // without a token, proxy.ts sends the user to the login page.
  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
  }
  if (!response.ok) {
    throw new Error(`Profile request failed with status ${response.status}`);
  }
  return (await response.json()) as Profile;
}

export function fetchProfile(): Promise<Profile> {
  return profileRequest();
}

export function updateDisplayName(displayName: string): Promise<Profile> {
  return profileRequest({
    method: "PATCH",
    body: JSON.stringify({ display_name: displayName }),
  });
}

const AVATAR_ENDPOINT = "/api/profile/avatar";

// The picture goes through our backend: it checks and compresses the image,
// saves it in the public "avatars" bucket and stores the link in the profile.
export function uploadAvatar(file: File): Promise<Profile> {
  const formData = new FormData();
  formData.append("file", file);
  return avatarRequest({ method: "POST", body: formData });
}

// Removes the picture, the app then shows the initials again
export function removeAvatar(): Promise<Profile> {
  return avatarRequest({ method: "DELETE" });
}

async function avatarRequest(init: RequestInit): Promise<Profile> {
  try {
    return await apiFetch<Profile>(AVATAR_ENDPOINT, {
      ...init,
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
  } catch (error) {
    // Same as above: an expired token sends the user back to the login page
    if (error instanceof ApiError && error.status === 401) {
      clearAuthToken();
      window.location.reload();
    }
    throw error;
  }
}
