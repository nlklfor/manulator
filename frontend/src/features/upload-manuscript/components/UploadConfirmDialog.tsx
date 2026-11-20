"use client";

// UploadConfirmDialog — asks for the name of a new page and its classes before uploading.
// As soon as it opens, the page is sent to the classifier: its suggestions fill the classes
// (document type, century, script, language, region), which the user checks and can edit.
// Fields the user already typed in are never overwritten, and the upload never has to wait.
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import TextField from "@/features/auth/components/TextField";
import type { UploadDetails } from "../api/uploadImage";
import { classifyPage } from "../api/classifyPage";
import { ClassFields, EMPTY_CLASSES, type ClassValues } from "./ClassFields";

interface UploadConfirmDialogProps {
  file: File;
  onConfirm: (details: UploadDetails) => void;
  onCancel: () => void;
}

type Detection = "detecting" | "done" | "failed";

const DETECTION_MESSAGE: Record<Detection, string> = {
  detecting: "Detecting the page's classes… You can already fill in the fields.",
  done: "Suggested from the page. Please check them before uploading.",
  failed: "Could not detect the classes. Please fill them in yourself.",
};

export function UploadConfirmDialog({ file, onConfirm, onCancel }: UploadConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [classes, setClasses] = useState<ClassValues>(EMPTY_CLASSES);
  const [detection, setDetection] = useState<Detection>("detecting");

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Ask the classifier as soon as the dialog opens; stop asking when it closes
  useEffect(() => {
    const controller = new AbortController();
    classifyPage(file, controller.signal)
      .then((suggestion) => {
        // Only fill fields that are still empty: never overwrite what the user typed
        setClasses((current) => ({
          documentType: current.documentType || suggestion.document_type || "",
          century: current.century || suggestion.century || "",
          script: current.script || suggestion.script || "",
          language: current.language || suggestion.language || "",
          region: current.region || suggestion.region || "",
        }));
        setDetection("done");
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetection("failed");
      });
    return () => controller.abort();
  }, [file]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onConfirm({
      title: String(form.get("title")).trim(),
      documentType: classes.documentType.trim(),
      century: classes.century.trim(),
      script: classes.script.trim(),
      language: classes.language.trim(),
      region: classes.region.trim(),
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

        <p
          role="status"
          className={`text-sm ${detection === "failed" ? "text-mt-danger-fg" : "text-mt-text-muted"}`}
        >
          {DETECTION_MESSAGE[detection]}
        </p>

        <ClassFields
          idPrefix="upload"
          values={classes}
          onChange={(name, value) => setClasses((current) => ({ ...current, [name]: value }))}
        />

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
