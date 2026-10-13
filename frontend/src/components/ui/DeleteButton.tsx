import { Loader2, Trash } from "lucide-react";

interface DeleteButtonProps {
  onClick: () => void | Promise<void>;
  label?: string;
  ariaLabel?: string; // needed when there is no visible label
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DeleteButton({
  onClick,
  label,
  ariaLabel,
  isLoading = false,
  disabled = false,
  className = "",
}: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={label ? undefined : (ariaLabel ?? "Delete")}
      className={`inline-flex h-7 items-center justify-center gap-1 rounded-mt-md bg-mt-danger px-3.5 text-sm font-medium text-mt-accent-fg disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash className="size-4" aria-hidden="true" />
      )}
      {label && <span>{label}</span>}
    </button>
  );
}
