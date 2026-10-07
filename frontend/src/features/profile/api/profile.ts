import { clearAuthToken, getAuthToken, getTokenClaims } from "@/lib/auth/session";

// Where the Supabase project lives and the key that browsers may use.
// Both come from frontend/.env.local (see docs/database.md).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const COLUMNS = "id,email,display_name,avatar_url";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
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
