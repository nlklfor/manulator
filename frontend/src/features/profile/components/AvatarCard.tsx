"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Avatar } from "@/components/ui/Avatar";
import { Toast } from "@/components/ui/Toast";
import { removeAvatar, uploadAvatar } from "../api/profile";
import { useProfile } from "../ProfileProvider";
import { getInitials, getShownName } from "../profileDisplay";
import { AVATAR_ACCEPT, validateAvatar } from "../validateAvatar";

// Shows the profile picture and lets the user upload a new one or remove it
export function AvatarCard() {
  const { profile, setProfile } = useProfile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"uploading" | "removing" | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  // Stable reference, so the Toast timer is not restarted on every render
  const closeToast = useCallback(() => setToast(null), []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the user pick the same file again after an error
    if (!file) return;

    const message = validateAvatar(file);
    if (message) {
      setError(message);
      return;
    }

    setError("");
    setBusy("uploading");
    try {
      // Share the new profile so the sidebar avatar updates too
      setProfile(await uploadAvatar(file));
      setToast("Profile picture updated");
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Could not upload your picture. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    setError("");
    setBusy("removing");
    try {
      setProfile(await removeAvatar());
      setToast("Profile picture removed");
    } catch (removeError) {
      setError(errorMessage(removeError, "Could not remove your picture. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      aria-labelledby="avatar-title"
      className="flex flex-col gap-5 rounded-mt-xl border border-mt-border bg-mt-surface p-6"
    >
      <h2 id="avatar-title" className="text-[17px] font-semibold text-mt-text">
        Profile picture
      </h2>

      {profile ? (
        <div className="flex items-center gap-5">
          <Avatar
            initials={getInitials(getShownName(profile))}
            imageUrl={profile.avatar_url}
            className="size-24 text-3xl"
          />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy !== null}
                className="flex h-9 items-center gap-2 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Camera className="size-4 text-mt-text-muted" aria-hidden="true" />
                {busy === "uploading"
                  ? "Uploading…"
                  : profile.avatar_url
                    ? "Change picture"
                    : "Upload a picture"}
              </button>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy !== null}
                  className="h-9 rounded-mt-md px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {busy === "removing" ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
            <p
              id="avatar-hint"
              role={error ? "alert" : undefined}
              className={`text-xs ${error ? "text-mt-danger-fg" : "text-mt-text-subtle"}`}
            >
              {error || "JPG, PNG or WebP, up to 5 MB. Without a picture we show your initials."}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={handleFile}
            aria-describedby="avatar-hint"
            className="hidden"
          />
        </div>
      ) : (
        <p className="text-sm text-mt-text-subtle">Loading…</p>
      )}

      {toast && <Toast message={toast} onClose={closeToast} />}
    </section>
  );
}

// Uses the backend's message (e.g. "This file is not a valid image.") when there is one
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && typeof error.detail === "string") {
    return error.detail;
  }
  return fallback;
}
