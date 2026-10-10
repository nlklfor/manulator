import { Check, Loader2, AlertCircle, FileText } from "lucide-react";
import type { LibraryEntry } from "@/features/upload-manuscript/types/upload";
import { ReactNode } from "react";

const STATUS_CONFIG: Record<
  LibraryEntry["status"],
  { label: string; badgeClass: string; icon: ReactNode }
> = {
  uploading: {
    label: "Uploading",
    badgeClass: "bg-mt-neutral-bg text-mt-neutral-fg",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  uploaded: {
    label: "Uploaded",
    badgeClass: "bg-mt-success-bg text-mt-success-fg",
    icon: <Check className="h-3 w-3" />,
  },
  "upload-failed": {
    label: "Upload failed",
    badgeClass: "bg-mt-danger-bg text-mt-danger-fg",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

interface ManuscriptCardProps {
  entry: LibraryEntry;
}

export function ManuscriptCard({ entry }: ManuscriptCardProps) {
  const status = STATUS_CONFIG[entry.status];

  return (
    <div className="overflow-hidden rounded-mt-lg border border-mt-border bg-mt-raised shadow-sm">
      {entry.fileType === "application/pdf" ? (
        <div className="flex aspect-[3/4] w-full items-center justify-center bg-mt-surface text-mt-text-subtle">
          <FileText className="h-10 w-10" strokeWidth={1.5} aria-label="PDF document" />
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={entry.previewUrl}
          alt={entry.fileName}
          className="aspect-[3/4] w-full object-cover"
        />
      )}
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-mt-text">{entry.fileName}</p>
        <span
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.badgeClass}`}
        >
          {status.icon}
          {status.label}
        </span>
      </div>
    </div>
  );
}
