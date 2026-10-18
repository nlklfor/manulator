import { AlertCircle, Check, Circle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_LABELS } from "../constants/status";
import type { UploadStatus } from "../types/upload";

const STATUS_STYLES: Record<UploadStatus, { badgeClass: string; icon: ReactNode }> = {
  uploading: {
    badgeClass: "bg-mt-neutral-bg text-mt-neutral-fg",
    icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
  },
  "upload-failed": {
    badgeClass: "bg-mt-danger-bg text-mt-danger-fg",
    icon: <AlertCircle className="h-3 w-3" aria-hidden="true" />,
  },
  uploaded: {
    badgeClass: "bg-mt-neutral-bg text-mt-neutral-fg",
    icon: <Circle className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />,
  },
  transcribing: {
    badgeClass: "bg-mt-warning-bg text-mt-warning-fg",
    icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
  },
  transcribed: {
    badgeClass: "bg-mt-accent-soft text-mt-accent-text",
    icon: <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />,
  },
  corrected: {
    badgeClass: "bg-mt-success-bg text-mt-success-fg",
    icon: <Check className="h-3 w-3" aria-hidden="true" />,
  },
};

interface StatusBadgeProps {
  status: UploadStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { badgeClass, icon } = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass} ${className}`}
    >
      {icon}
      {STATUS_LABELS[status]}
    </span>
  );
}
