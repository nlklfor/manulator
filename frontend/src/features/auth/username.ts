// Username rules, the same as the backend and the database CHECK:
// 3 to 30 characters, only lowercase letters, digits and _.
// Used at registration and on the profile page.

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_TAKEN_MESSAGE = "Username already taken";

export interface UsernameRule {
  id: string;
  label: string;
  test: (username: string) => boolean;
}

// Shown below the field, like the password requirements
export const USERNAME_RULES: UsernameRule[] = [
  {
    id: "length",
    label: `${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters`,
    test: (username) =>
      username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH,
  },
  {
    id: "characters",
    label: "Only a-z, 0-9 and _",
    test: (username) => username.length > 0 && /^[a-z0-9_]+$/.test(username),
  },
];

// Usernames are stored in lowercase, so "Alice" and "alice" are the same name
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

// Returns an error message, or "" when the (normalized) username is fine
export function validateUsername(username: string): string {
  if (!username) return "Choose a username.";
  const unmet = USERNAME_RULES.filter((rule) => !rule.test(username));
  if (unmet.length > 0) {
    return `Username needs ${unmet.map((rule) => rule.label.toLowerCase()).join(", ")}.`;
  }
  return "";
}
