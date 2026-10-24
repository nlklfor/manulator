import { FileText, ImageOff, Pencil } from "lucide-react";
import Link from "next/link";
import type { LibraryEntry } from "@/features/upload-manuscript/types/upload";
import { useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { StatusBadge } from "./StatusBadge";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { deleteManuscript } from "@/features/upload-manuscript/api/deleteManuscripts";
import type { UploadDetails } from "@/features/upload-manuscript/api/uploadImage";
import { EditManuscriptDialog } from "./EditManuscriptDialog";

interface ManuscriptCardProps {
  entry: LibraryEntry;
  onDeleted: (id: string, success: boolean, message: string) => void;
  onEdit: (id: string, details: UploadDetails) => Promise<void>;
}

export function ManuscriptCard({ entry, onDeleted, onEdit }: ManuscriptCardProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  // True while the "Are you sure?" dialog is open
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // True while the edit form is open
  const [editing, setEditing] = useState(false);
  // Only manuscripts that are saved in the backend can be edited
  const canEdit = entry.status !== "uploading" && entry.status !== "upload-failed";

  async function handleDelete() {
    if (deleteLoading) {
      return;
    }

    // A failed upload never reached the backend, so there is nothing to delete there.
    // Remove it from the library only; otherwise it could never be removed.
    if (entry.status === "upload-failed") {
      onDeleted(entry.id, true, "Failed upload removed");
      return;
    }

    setDeleteLoading(true);
    const { success, message } = await deleteManuscript(entry.id);
    setDeleteLoading(false);
    // handle the deletion result in the parent component
    onDeleted(entry.id, success, message);
  }

  return (
    <div className="group relative overflow-hidden rounded-mt-lg border border-mt-border bg-mt-raised shadow-sm">
      {/* Image and file name open the workspace; the status badge and delete button stay outside the link */}
      <Link
        href={`/manuscript/${entry.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-mt-accent"
      >
        {entry.fileType === "application/pdf" ? (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-mt-surface text-mt-text-subtle">
            <FileText className="h-10 w-10" strokeWidth={1.5} aria-label="PDF document" />
          </div>
        ) : !entry.previewUrl ? (
          // The backend sends an empty url when it could not create the preview link
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-mt-surface text-mt-text-subtle">
            <ImageOff className="h-10 w-10" strokeWidth={1.5} aria-label="Preview not available" />
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={entry.previewUrl}
            alt={entry.fileName}
            className="aspect-[3/4] w-full object-cover"
          />
        )}
        <p className="truncate px-2.5 pt-2.5 text-sm font-medium text-mt-text">{entry.fileName}</p>
      </Link>
      <div className="px-2.5 pb-2.5">
        <StatusBadge status={entry.status} className="mt-1.5" />
      </div>

      {/* Edit and delete buttons: top right, shown on hover or keyboard focus (always on touch
          screens, which have no hover). They are outside the link, so clicking them does not
          navigate. Disabled while the file is still uploading. */}
      <div
        className={`absolute right-2 top-2 flex gap-1.5 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
          deleteLoading ? "opacity-100" : "opacity-0"
        }`}
      >
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${entry.fileName}`}
            className="inline-flex h-7 items-center justify-center rounded-mt-md border border-mt-border bg-mt-surface px-3 text-mt-text hover:bg-mt-raised"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        )}
        <DeleteButton
          onClick={() => setConfirmingDelete(true)}
          disabled={deleteLoading || entry.status === "uploading"}
          isLoading={deleteLoading}
          ariaLabel={`Delete ${entry.fileName}`}
        />
      </div>

      {editing && (
        <EditManuscriptDialog
          title={entry.fileName}
          documentType={entry.documentType}
          onSave={async (details) => {
            await onEdit(entry.id, details);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {confirmingDelete && (
        <DeleteConfirmDialog
          name={entry.fileName}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false);
            handleDelete();
          }}
        />
      )}
    </div>
  );
}
