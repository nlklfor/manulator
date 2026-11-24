"use client";

// UploadConfirmDialog — asks for the name of a new page and its classes before uploading.
// As soon as it opens, the page is sent to the classifier: its suggestions fill the classes
// (document type, century, script, language, region), which the user checks and can edit.
// Fields the user already typed in are never overwritten, and the upload never has to wait.
// "Classify again" asks once more; its answers then replace the fields it has a value for.
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Workflow } from "lucide-react";
import TextField from "@/features/auth/components/TextField";
import type { UploadDetails } from "../api/uploadImage";
import { classifyPage } from "../api/classifyPage";
import { ClassFields, EMPTY_CLASSES, type ClassValues } from "./ClassFields";
import {
  ClassifyStatus,
  replaceWithAnswers,
  toClassValues,
  type Detection,
} from "./ClassifyStatus";

interface UploadConfirmDialogProps {
  file: File;
  // process = true: after the upload, also transcribe, translate and summarize the page
  onConfirm: (details: UploadDetails, process: boolean) => void;
  onCancel: () => void;
}

export function UploadConfirmDialog({ file, onConfirm, onCancel }: UploadConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [classes, setClasses] = useState<ClassValues>(EMPTY_CLASSES);
  const [detection, setDetection] = useState<Detection>("detecting");
  // 0 = the automatic first try; each "Classify again" adds one and asks once more
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Ask the classifier as soon as the dialog opens; stop asking when it closes
  useEffect(() => {
    const controller = new AbortController();
    classifyPage(file, controller.signal)
      .then((suggestion) => {
        const found = toClassValues(suggestion);
        // First try: only fill empty fields, never overwrite what the user typed.
        // "Classify again": the user asked for new answers, so they replace the fields.
        setClasses((current) =>
          attempt === 0 ? replaceWithAnswers(found, current) : replaceWithAnswers(current, found),
        );
        setDetection("done");
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetection("failed");
      });
    return () => controller.abort();
  }, [file, attempt]);

  function classifyAgain() {
    setDetection("detecting");
    setAttempt((count) => count + 1);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Which button was pressed: "Upload" or "Upload & process"
    const submitter = (event.nativeEvent as globalThis.SubmitEvent).submitter;
    const process = submitter?.getAttribute("value") === "process";
    onConfirm(
      {
        title: String(form.get("title")).trim(),
        documentType: classes.documentType.trim(),
        century: classes.century.trim(),
        script: classes.script.trim(),
        language: classes.language.trim(),
        region: classes.region.trim(),
      },
      process,
    );
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

        <ClassifyStatus detection={detection} onClassifyAgain={classifyAgain} />

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
            value="upload"
            className="rounded-mt-md border border-mt-border-strong bg-mt-raised px-4 py-2 text-sm font-medium text-mt-text hover:bg-mt-hover"
          >
            Upload
          </button>
          <button
            type="submit"
            value="process"
            title="Upload, then transcribe, translate sentence by sentence and summarize the page"
            className="inline-flex items-center gap-1.5 rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
          >
            <Workflow className="h-4 w-4" aria-hidden="true" />
            Upload & process
          </button>
        </div>
      </form>
    </dialog>
  );
}
