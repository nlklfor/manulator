"use client";

// EditManuscriptDialog — form to change the name and the classes of a manuscript
// (document type, century, script, language, region). Same fields as UploadConfirmDialog,
// prefilled with the current values. "Classify again" lets the classifier read the stored
// page once more; its suggestions fill the fields, and are saved only with "Save".
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import TextField from "@/features/auth/components/TextField";
import type { UploadDetails } from "../api/uploadImage";
import { classifyUploadedPage } from "../api/classifyPage";
import { ClassFields, type ClassName, type ClassValues } from "./ClassFields";
import {
  ClassifyStatus,
  replaceWithAnswers,
  toClassValues,
  type Detection,
} from "./ClassifyStatus";

interface EditManuscriptDialogProps {
  manuscriptId: string;
  title: string;
  classes: ClassValues; // "" = unknown
  onSave: (details: UploadDetails) => Promise<void>; // throws when saving fails
  onCancel: () => void;
}

const CLASS_NAMES: ClassName[] = ["documentType", "century", "script", "language", "region"];

export function EditManuscriptDialog({
  manuscriptId,
  title,
  classes: savedClasses,
  onSave,
  onCancel,
}: EditManuscriptDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassValues>(savedClasses);
  const [detection, setDetection] = useState<Detection>("idle");
  // Stops a running classification when the dialog closes or the user asks again
  const classifyRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => classifyRef.current?.abort();
  }, []);

  function classifyAgain() {
    classifyRef.current?.abort();
    const controller = new AbortController();
    classifyRef.current = controller;
    setDetection("detecting");
    classifyUploadedPage(manuscriptId, controller.signal)
      .then((suggestion) => {
        // The user asked for new answers, so they replace the fields
        setClasses((current) => replaceWithAnswers(current, toClassValues(suggestion)));
        setDetection("done");
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetection("failed");
      });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const details: UploadDetails = {
      title: String(form.get("title")).trim(),
      documentType: classes.documentType.trim(),
      century: classes.century.trim(),
      script: classes.script.trim(),
      language: classes.language.trim(),
      region: classes.region.trim(),
    };

    // Nothing changed, so there is nothing to save
    const unchanged =
      details.title === title && CLASS_NAMES.every((name) => details[name] === savedClasses[name]);
    if (unchanged) {
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

        <ClassifyStatus detection={detection} onClassifyAgain={classifyAgain} disabled={saving} />

        <ClassFields
          idPrefix="edit"
          values={classes}
          detecting={detection === "detecting"}
          onChange={(name, value) => setClasses((current) => ({ ...current, [name]: value }))}
          disabled={saving}
        />

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
