// Same rules as the backend (backend/app/services/profile.py), checked here
// first so the user gets an answer without waiting for the upload.
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");
export const MAX_AVATAR_MB = 5;

// Returns an error message, or null when the file is fine
export function validateAvatar(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) {
    return "Please choose a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
    return `The picture must be smaller than ${MAX_AVATAR_MB} MB.`;
  }
  return null;
}
