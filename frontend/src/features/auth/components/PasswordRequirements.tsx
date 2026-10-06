import { PASSWORD_RULES } from "@/features/auth/hooks/registrationValidation";

type PasswordRequirementsProps = {
  id: string;
  password: string;
};

export default function PasswordRequirements({ id, password }: PasswordRequirementsProps) {
  return (
    <ul
      id={id}
      aria-label="Password requirements"
      className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
    >
      {PASSWORD_RULES.map((rule) => {
        const isMet = rule.test(password);
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
