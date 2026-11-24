import { USERNAME_RULES, normalizeUsername } from "@/features/auth/username";

type UsernameRequirementsProps = {
  id: string;
  username: string;
};

// The username rules with a tick for each one that is met (like PasswordRequirements)
export default function UsernameRequirements({ id, username }: UsernameRequirementsProps) {
  const normalized = normalizeUsername(username);
  return (
    <ul
      id={id}
      aria-label="Username requirements"
      className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
    >
      {USERNAME_RULES.map((rule) => {
        const isMet = rule.test(normalized);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${isMet ? "text-mt-success-fg" : "text-mt-text-muted"}`}
          >
            <span aria-hidden="true">{isMet ? "✓" : "○"}</span>
            {rule.label}
            <span className="sr-only">{isMet ? " (done)" : " (not yet)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
