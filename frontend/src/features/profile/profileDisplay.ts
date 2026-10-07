import type { Profile } from "./api/profile";

// The name to show for a user: their display name, or their email if none is set
export function getShownName(profile: Profile): string {
  return profile.display_name?.trim() || profile.email;
}

// Up to two initials for the avatar
export function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  return initials || "?";
}
