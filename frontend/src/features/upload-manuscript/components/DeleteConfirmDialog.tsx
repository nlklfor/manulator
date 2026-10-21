"use client";

// DeleteConfirmDialog — asks "Are you sure?" before a manuscript is deleted.
// Uses the native <dialog> element, like UploadConfirmDialog: showModal() gives
// the backdrop, focus trap and the Esc key for free.
import { useEffect, useRef } from "react";

interface DeleteConfirmDialogProps {
  name: string; // name of the manuscript, shown in the question
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ name, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      aria-labelledby="delete-confirm-title"
      className="m-auto w-full max-w-sm rounded-mt-lg border border-mt-border bg-mt-surface p-6 text-mt-text shadow-lg backdrop:bg-black/40"
    >
      <h2 id="delete-confirm-title" className="text-lg font-semibold">
        Delete manuscript
      </h2>
      <p className="mt-2 text-sm text-mt-text-muted">
        Are you sure you want to delete <strong className="text-mt-text">{name}</strong>? This
        cannot be undone.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="rounded-mt-md border border-mt-border px-4 py-2 text-sm font-medium text-mt-text hover:bg-mt-raised"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-mt-md bg-mt-danger px-4 py-2 text-sm font-medium text-mt-accent-fg"
        >
          Delete
        </button>
      </div>
    </dialog>
  );
}
