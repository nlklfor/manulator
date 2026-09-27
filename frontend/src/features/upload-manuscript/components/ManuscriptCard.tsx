import { Check, Loader2, AlertCircle } from "lucide-react";
import type { LibraryEntry } from "../types/upload";

const STATUS_CONFIG: Record<
  LibraryEntry["status"],
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  uploading: {
    label: "Uploading",
    badgeClass: "bg-stone-100 text-stone-600",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  uploaded: {
    label: "Uploaded",
    badgeClass: "bg-blue-50 text-blue-700",
    icon: <Check className="h-3 w-3" />,
  },
  "upload-failed": {
    label: "Upload failed",
    badgeClass: "bg-red-50 text-red-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

interface ManuscriptCardProps {
  entry: LibraryEntry;
}

export function ManuscriptCard({ entry }: ManuscriptCardProps) {
  const status = STATUS_CONFIG[entry.status];

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.previewUrl}
        alt={entry.fileName}
        className="aspect-[3/4] w-full object-cover"
      />
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-stone-900">{entry.fileName}</p>
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
