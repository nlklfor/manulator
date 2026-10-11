"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { ImageUp, TriangleAlert, X } from "lucide-react";
import { DEFAULT_CROP, resizeAvatar } from "../resizeAvatar";
import type { CropPosition } from "../resizeAvatar";
import { AVATAR_ACCEPT, MAX_AVATAR_MB, validateAvatar } from "../validateAvatar";
import { AvatarCropper } from "./AvatarCropper";

interface AvatarDialogProps {
  onClose: () => void;
  // Uploads the finished picture. Throws if that fails, the dialog then shows an error.
  onSave: (picture: Blob) => Promise<void>;
}

// A problem with the chosen file, shown as "<file name> <message>"
interface PickError {
  fileName: string;
  message: string;
}

const BUTTON = "h-9 rounded-mt-md px-3.5 text-sm font-medium disabled:opacity-45";
const SECONDARY = `${BUTTON} border border-mt-border-strong bg-mt-raised text-mt-text hover:bg-mt-hover`;

/**
 * "Change profile picture" in two steps:
 * 1. choose a picture (drop it or browse files), 2. position it and save.
 * Uses the browser's own <dialog>: it keeps keyboard focus inside and
 * closes on Escape.
 */
export function AvatarDialog({ onClose, onSave }: AvatarDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null); // null = step 1
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState<CropPosition>(DEFAULT_CROP);
  const [pickError, setPickError] = useState<PickError | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Open as a modal as soon as the dialog appears
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // The local preview link of the chosen file is freed again when it changes or the dialog closes
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function takeFile(chosen: File | undefined) {
    setIsDragOver(false);
    if (!chosen) return;

    const message = validateAvatar(chosen);
    if (message) {
      setPickError({ fileName: chosen.name, message });
      return;
    }
    setPickError(null);
    setSaveError("");
    setCrop(DEFAULT_CROP);
    setFile(chosen);
    setImageUrl(URL.createObjectURL(chosen));
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    takeFile(event.target.files?.[0]);
    event.target.value = ""; // lets the user pick the same file again
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); // needed so the browser allows dropping here
    setIsDragOver(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); // stops the browser from opening the file itself
    takeFile(event.dataTransfer.files[0]);
  }

  // Back to step 1, e.g. when the browser could not open the file as a picture
  function backToPick(error: PickError | null = null) {
    setFile(null);
    setImageUrl("");
    setPickError(error);
  }

  async function handleSave() {
    if (!file) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(await resizeAvatar(file, crop));
      // On success the profile page closes the dialog
    } catch {
      setSaveError("Could not save your picture. Please try again.");
      setSaving(false);
    }
  }

  const isCropStep = file !== null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="avatar-dialog-title"
      onClose={onClose}
      // Escape does nothing while the picture is being saved
      onCancel={(event) => saving && event.preventDefault()}
      className="m-auto w-[520px] max-w-[calc(100vw-32px)] overflow-hidden rounded-mt-xl border border-mt-border bg-mt-raised p-0 text-mt-text shadow-2xl backdrop:bg-[rgba(20,16,10,0.5)]"
    >
      <div className="flex items-start justify-between gap-4 pt-5 pr-5 pl-6">
        <div>
          <h2 id="avatar-dialog-title" className="text-xl font-semibold">
            {isCropStep ? "Position your picture" : "Change profile picture"}
          </h2>
          <p className="mt-1 text-[13px] text-mt-text-muted">
            {isCropStep ? "Step 2 of 2 · adjust and save" : "Step 1 of 2 · choose a picture"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
          disabled={saving}
          className="flex size-8 items-center justify-center rounded-mt-md text-mt-text-muted hover:bg-mt-hover disabled:opacity-45"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {isCropStep ? (
        <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
          <AvatarCropper
            imageUrl={imageUrl}
            crop={crop}
            onChange={setCrop}
            onImageError={() =>
              backToPick({
                fileName: file?.name ?? "",
                message: "could not be opened as a picture.",
              })
            }
          />
          {saveError && <ErrorAlert>{saveError}</ErrorAlert>}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className="flex flex-col gap-4 px-6 pt-4 pb-6"
        >
          <div
            className={`flex flex-col items-center gap-3 rounded-mt-lg border-[1.5px] border-dashed px-6 py-9 text-center ${
              isDragOver
                ? "border-mt-accent bg-mt-accent-soft"
                : pickError
                  ? "border-mt-danger bg-mt-danger-bg"
                  : "border-mt-border-strong bg-mt-surface"
            }`}
          >
            <span className="flex size-13 items-center justify-center rounded-full bg-mt-accent-soft text-mt-accent-text">
              <ImageUp className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">
              Drop a picture here, or{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-mt-accent-text underline underline-offset-2"
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-mt-text-subtle">
              JPG, PNG or WebP · up to {MAX_AVATAR_MB} MB · a square picture of your face works best
            </p>
          </div>
          {pickError && (
            <ErrorAlert>
              <strong>{pickError.fileName}</strong> {pickError.message}
            </ErrorAlert>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={handleInput}
            className="hidden"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-mt-border bg-mt-surface px-6 py-3.5">
        {isCropStep && (
          <button
            type="button"
            onClick={() => backToPick()}
            disabled={saving}
            className={`${BUTTON} mr-auto text-mt-text hover:bg-mt-hover`}
          >
            Choose another picture
          </button>
        )}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          disabled={saving}
          className={SECONDARY}
        >
          Cancel
        </button>
        {isCropStep && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`${BUTTON} bg-mt-accent text-mt-accent-fg hover:bg-mt-accent-hover`}
          >
            {saving ? "Saving…" : "Save picture"}
          </button>
        )}
      </div>
    </dialog>
  );
}

// Red message box used for both steps
function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-mt-md bg-mt-danger-bg px-3 py-2.5 text-sm text-mt-danger-fg"
    >
      <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
