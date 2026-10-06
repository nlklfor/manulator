import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: ReactNode;
  hint?: ReactNode;
  endAdornment?: ReactNode;
  describedById?: string;
  children?: ReactNode;
};

export default function TextField({
  id,
  label,
  error,
  hint,
  endAdornment,
  describedById,
  children,
  ...inputProps
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const messageId = error ? errorId : hint ? hintId : undefined;
  const describedBy = [describedById, messageId].filter(Boolean).join(" ") || undefined;

  const stateClassName = error
    ? "border-mt-danger focus:border-mt-danger focus:ring-mt-danger/20"
    : "border-mt-border-strong focus:border-mt-accent focus:ring-mt-accent/20";

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-mt-text">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          {...inputProps}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full rounded-mt-md border bg-mt-raised px-3 py-2 text-sm text-mt-text outline-none transition focus:ring-2 disabled:opacity-60 ${stateClassName} ${endAdornment ? "pr-16" : ""}`}
        />
        {endAdornment}
      </div>
      {children}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-mt-danger-fg">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-xs text-mt-text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
