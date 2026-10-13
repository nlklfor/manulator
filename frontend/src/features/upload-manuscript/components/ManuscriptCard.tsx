import { FileText } from "lucide-react";
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
    if (deleteLoading) {
      return;
    }
    setDeleteLoading(true);

    // NOTE: Here we need to replace the entry.id by the real manuscript ID
    const { success, message } = await deleteManuscript(entry.id);
    setDeleteLoading(false);
    // handle the deletion result in the parent component
    onDeleted(entry.id, success, message);
  }

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
        <div className="flex justify-between">
          <div>
            <StatusBadge status={entry.status} className="mt-1.5" />
          </div>
          <DeleteButton
            onClick={handleDelete}
            disabled={deleteLoading}
            isLoading={deleteLoading}
            ariaLabel={`Delete ${entry.fileName}`}
          />
        </div>
      </div>
    </div>
  );
}
