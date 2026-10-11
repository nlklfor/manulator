// Checks the file the user picked, before it is cropped and resized in the browser.
// The resized picture is then limited again by the "avatars" bucket settings
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");
export const MAX_AVATAR_MB = 5;

// Returns the end of an error sentence that follows the file name
// (example "IMG_2041.png is 11.8 MB. ..."), or null when the file is fine
export function validateAvatar(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) {
    return "isn’t a JPG, PNG or WebP picture.";
  }
  if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return `is ${sizeMb} MB. Choose a picture under ${MAX_AVATAR_MB} MB.`;
  }
  return null;
}
