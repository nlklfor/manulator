import { clearAuthToken, getAuthToken, getTokenClaims } from "@/lib/auth/session";

// Where the Supabase project lives and the key that browsers may use.
// Both come from frontend/.env.local (see docs/database.md).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const COLUMNS = "id,email,display_name,avatar_url,username";
const AVATAR_BUCKET = "avatars";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null; // null for accounts created before sharing existed
}

// Thrown when a profile request fails; status tells why (409 = username taken)
export class ProfileRequestError extends Error {
  constructor(public status: number) {
    super(`Profile request failed with status ${status}`);
    this.name = "ProfileRequestError";
  }
}

function getSession() {
  const token = getAuthToken();
  const user = getTokenClaims();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase URL or key is missing in frontend/.env.local");
  }
  if (!token || !user) {
    throw new Error("Not logged in");
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY, token, userId: user.id };
}

// 401 means the token has expired. Clear it and reload the page, so the user is sent to the login page.
function handleExpiredToken(response: Response) {
  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
  }
}

// Sends one request to the user's own row in the `profiles` table
async function profileRequest(init?: RequestInit): Promise<Profile> {
  const { url, key, token, userId } = getSession();

  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}&select=${COLUMNS}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.pgrst.object+json",
      Prefer: "return=representation",
    },
  });

  handleExpiredToken(response);
  if (!response.ok) {
    throw new ProfileRequestError(response.status);
  }
  return (await response.json()) as Profile;
}

export function fetchProfile(): Promise<Profile> {
  return profileRequest();
}

// Saves only the given columns (the database allows display_name, avatar_url and username)
function updateProfile(
  changes: Partial<Pick<Profile, "display_name" | "avatar_url" | "username">>,
) {
  return profileRequest({ method: "PATCH", body: JSON.stringify(changes) });
}

export function updateDisplayName(displayName: string): Promise<Profile> {
  return updateProfile({ display_name: displayName });
}

// Saves a new username. A name someone else already has fails with
// ProfileRequestError status 409 (the database's unique index).
export function updateUsername(username: string): Promise<Profile> {
  return updateProfile({ username });
}

/**
 * Each user has exactly one picture file: avatars/<user id>/avatar.
 * A new upload overwrites it, so old pictures never pile up in the bucket.
 */
function avatarFileUrl(url: string, userId: string) {
  return `${url}/storage/v1/object/${AVATAR_BUCKET}/${userId}/avatar`;
}

// Uploads the (already resized) picture and saves its public link in the profile
export async function uploadAvatar(picture: Blob): Promise<Profile> {
  const { url, key, token, userId } = getSession();

  const response = await fetch(avatarFileUrl(url, userId), {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": picture.type,
      "x-upsert": "true", // replace the existing picture instead of failing
    },
    body: picture,
  });

  handleExpiredToken(response);
  if (!response.ok) {
    throw new Error(`Avatar upload failed with status ${response.status}`);
  }

  // The file name never changes, so "?v=<time>" makes browsers load the new picture instead of showing the old one from their cache
  const publicUrl = `${url}/storage/v1/object/public/${AVATAR_BUCKET}/${userId}/avatar`;
  return updateProfile({ avatar_url: `${publicUrl}?v=${Date.now()}` });
}

// Removes the picture, the app then shows the initials again
export async function removeAvatar(): Promise<Profile> {
  const { url, key, token, userId } = getSession();

  // Clear the link first, so the profile never points to a deleted file
  const profile = await updateProfile({ avatar_url: null });

  // Then delete the file. If this fails, the next upload overwrites it anyway.
  await fetch(avatarFileUrl(url, userId), {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  }).catch(() => undefined);

  return profile;
}

// Checks whether the logged-in user has clicked the confirmation link in their email.
// Supabase sets `email_confirmed_at` on the auth user object when they do.
// We read it from /auth/v1/user instead of the profiles table, so no schema change is needed.
export async function fetchEmailVerified(): Promise<boolean> {
  const { url, key, token } = getSession();

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });

  handleExpiredToken(response);
  if (!response.ok) return false;

  const user = (await response.json()) as { email_confirmed_at?: string | null };
  return Boolean(user.email_confirmed_at);
}
