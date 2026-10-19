import { FileText } from "lucide-react";
import Link from "next/link";
import type { LibraryEntry } from "@/features/upload-manuscript/types/upload";
import { useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { StatusBadge } from "./StatusBadge";
import { deleteManuscript } from "@/features/upload-manuscript/api/deleteManuscripts";

interface ManuscriptCardProps {
  entry: LibraryEntry;
  onDeleted: (id: string, success: boolean, message: string) => void;
}

export function ManuscriptCard({ entry, onDeleted }: ManuscriptCardProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (deleteLoading) return;
    setDeleteLoading(true);
    const { success, message } = await deleteManuscript(entry.id);
    setDeleteLoading(false);
    onDeleted(entry.id, success, message);
  }

  return (
    // Outer wrapper is relative so the delete button can be positioned absolutely on top of the Link
    <div className="group relative overflow-hidden rounded-mt-lg border border-mt-border bg-mt-raised shadow-sm">
      <Link
        href={`/manuscript/${entry.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-mt-accent"
      >
        {entry.fileType === "application/pdf" ? (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-mt-surface text-mt-text-subtle">
            <FileText className="h-10 w-10" strokeWidth={1.5} aria-label="PDF document" />
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={entry.previewUrl}
            alt={entry.fileName}
            className="aspect-[3/4] w-full object-cover transition-opacity group-hover:opacity-90"
          />
        )}
        <div className="p-2.5">
          <p className="truncate text-sm font-medium text-mt-text">{entry.fileName}</p>
          <StatusBadge status={entry.status} className="mt-1.5" />
        </div>
      </Link>

      {/* Delete button is outside the Link so clicking it does not navigate */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DeleteButton
          onClick={handleDelete}
          disabled={deleteLoading}
          isLoading={deleteLoading}
          ariaLabel={`Delete ${entry.fileName}`}
        />
      </div>
    </div>
  );
}
