"use client";

import { useEffect, useRef, type SubmitEvent } from "react";
import TextField from "@/features/auth/components/TextField";
import type { UploadDetails } from "../api/uploadImage";
import { DOCUMENT_TYPES } from "../constants/documentTypes";

interface UploadConfirmDialogProps {
  file: File;
  onConfirm: (details: UploadDetails) => void;
  onCancel: () => void;
}

export function UploadConfirmDialog({ file, onConfirm, onCancel }: UploadConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onConfirm({
      title: String(form.get("title")).trim(),
      documentType: String(form.get("documentType")).trim(),
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      aria-labelledby="upload-confirm-title"
      className="m-auto w-full max-w-md rounded-mt-lg border border-mt-border bg-mt-surface p-6 text-mt-text shadow-lg backdrop:bg-black/40"
    >
      <h2 id="upload-confirm-title" className="text-lg font-semibold">
        Upload manuscript
      </h2>
      <p className="mt-1 truncate text-sm text-mt-text-muted">{file.name}</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <TextField
          id="upload-title"
          name="title"
          label="Name"
          required
          maxLength={200}
          defaultValue={file.name.replace(/\.[^.]+$/, "")}
        />

        <TextField
          id="upload-document-type"
          name="documentType"
          label="Document type"
          required
          maxLength={50}
          list="document-type-options"
          placeholder="e.g. Charter"
          hint="Pick a suggestion or type your own."
        />
        <datalist id="document-type-options">
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-mt-md border border-mt-border px-4 py-2 text-sm font-medium text-mt-text hover:bg-mt-raised"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
          >
            Upload
          </button>
        </div>
      </form>
    </dialog>
  );
}
