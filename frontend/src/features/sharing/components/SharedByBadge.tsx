import { Users } from "lucide-react";

// "Shared by @alice" on a copy received from another user.
// Nothing is shown for the user's own manuscripts.
export function SharedByBadge({
  username,
  className = "",
}: {
  username?: string | null;
  className?: string;
}) {
  if (!username) return null;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 text-xs text-mt-text-muted ${className}`}
    >
      <Users className="size-3.5 flex-none" aria-hidden="true" />
      <span className="truncate">Shared by @{username}</span>
    </span>
  );
}
