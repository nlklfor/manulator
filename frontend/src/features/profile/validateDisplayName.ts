export const MAX_NAME_LENGTH = 40;
const MIN_NAME_LENGTH = 2;

// Checks a display name. Returns an error message, or "" when the name is fine.
export function validateDisplayName(name: string): string {
  if (!name) return "Enter a display name.";
  if (name.length < MIN_NAME_LENGTH) return `Use at least ${MIN_NAME_LENGTH} characters.`;
  if (name.length > MAX_NAME_LENGTH) return `Use ${MAX_NAME_LENGTH} characters or fewer.`;
  return "";
}
