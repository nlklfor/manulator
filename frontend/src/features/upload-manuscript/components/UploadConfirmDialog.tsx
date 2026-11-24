"use client";

// UploadConfirmDialog — asks for the name of a new page and its classes before uploading.
// As soon as it opens, the page is sent to the classifier: its suggestions fill the classes
// (document type, century, script, language, region), which the user checks and can edit.
// Fields the user already typed in are never overwritten, and the upload never has to wait.
import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
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

const DETECTION_STATUS: Record<
  Detection,
  { icon: ReactNode; title: string; text: string; className: string }
> = {
  detecting: {
    icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
    title: "Reading the page…",
    text: "The fields below fill in by themselves in a few seconds. You can already type.",
    className: "border-mt-accent/30 bg-mt-accent/10 text-mt-text",
  },
  done: {
    icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    title: "Suggested from the page",
    text: "Please check them before uploading.",
    className: "border-mt-border bg-mt-raised text-mt-text",
  },
  failed: {
    icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
    title: "Could not detect the classes",
    text: "Please fill them in yourself.",
    className: "border-mt-danger/30 bg-mt-danger/10 text-mt-danger-fg",
  },
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
        const found: ClassValues = {
          documentType: suggestion.document_type || "",
          century: suggestion.century || "",
          script: suggestion.script || "",
          language: suggestion.language || "",
          region: suggestion.region || "",
        };
        setClasses((current) => ({
          documentType: current.documentType || found.documentType,
          century: current.century || found.century,
          script: current.script || found.script,
          language: current.language || found.language,
          region: current.region || found.region,
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

  const status = DETECTION_STATUS[detection];

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

        <div
          role="status"
          className={`flex gap-2.5 rounded-mt-md border px-3 py-2.5 text-sm ${status.className}`}
        >
          <span className="mt-0.5 shrink-0">{status.icon}</span>
          <span>
            <strong className="block font-medium">{status.title}</strong>
            <span className="text-xs opacity-80">{status.text}</span>
          </span>
        </div>

        <ClassFields
          idPrefix="upload"
          values={classes}
          detecting={detection === "detecting"}
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
