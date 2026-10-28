"use client";

// EditManuscriptDialog — form to change the name and the document type of a manuscript.
// Same fields as UploadConfirmDialog (suggestions + own text), prefilled with the current values.
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import TextField from "@/features/auth/components/TextField";
import { DOCUMENT_TYPES } from "../constants/documentTypes";
import type { UploadDetails } from "../api/uploadImage";

interface EditManuscriptDialogProps {
  title: string;
  documentType: string;
  onSave: (details: UploadDetails) => Promise<void>; // throws when saving fails
  onCancel: () => void;
}

export function EditManuscriptDialog({
  title,
  documentType,
  onSave,
  onCancel,
}: EditManuscriptDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const details = {
      title: String(form.get("title")).trim(),
      documentType: String(form.get("documentType")).trim(),
    };

    // Nothing changed, so there is nothing to save
    if (details.title === title && details.documentType === documentType) {
      onCancel();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(details); // the parent closes the dialog when this succeeds
    } catch {
      setError("Could not save the changes. Please try again.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      aria-labelledby="edit-manuscript-title"
      className="m-auto w-full max-w-md rounded-mt-lg border border-mt-border bg-mt-surface p-6 text-mt-text shadow-lg backdrop:bg-black/40"
    >
      <h2 id="edit-manuscript-title" className="text-lg font-semibold">
        Edit manuscript
      </h2>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <TextField
          id="edit-title"
          name="title"
          label="Name"
          required
          maxLength={200}
          defaultValue={title}
        />

        <TextField
          id="edit-document-type"
          name="documentType"
          label="Document type"
          required
          maxLength={50}
          list="edit-document-type-options"
          placeholder="e.g. Charter"
          defaultValue={documentType}
          hint="Pick a suggestion or type your own."
        />
        <datalist id="edit-document-type-options">
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>

        {error && (
          <p role="alert" className="text-sm text-mt-danger-fg">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-mt-md border border-mt-border px-4 py-2 text-sm font-medium text-mt-text hover:bg-mt-raised disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
