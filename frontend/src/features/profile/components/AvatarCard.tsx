"use client";

import { useCallback, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Toast } from "@/components/ui/Toast";
import { removeAvatar, uploadAvatar } from "../api/profile";
import { useProfile } from "../ProfileProvider";
import { getInitials, getShownName } from "../profileDisplay";
import { MAX_AVATAR_MB } from "../validateAvatar";
import { AvatarDialog } from "./AvatarDialog";

// Shows the profile picture and lets the user change or remove it
export function AvatarCard() {
  const { profile, setProfile } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  // Stable reference, so the Toast timer is not restarted on every render
  const closeToast = useCallback(() => setToast(null), []);

  // Called by the dialog with the cropped picture. If this throws,
  // the dialog stays open and shows an error.
  async function handleSave(picture: Blob) {
    // Share the new profile so the sidebar avatar updates too
    setProfile(await uploadAvatar(picture));
    setDialogOpen(false);
    setError("");
    setToast("Profile picture updated");
  }

  async function handleRemove() {
    setError("");
    setRemoving(true);
    try {
      setProfile(await removeAvatar());
      setToast("Profile picture removed");
    } catch {
      setError("Could not remove your picture. Please try again.");
    } finally {
      setRemoving(false);
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
                onClick={() => setDialogOpen(true)}
                disabled={removing}
                className="flex h-9 items-center gap-2 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Camera className="size-4 text-mt-text-muted" aria-hidden="true" />
                {profile.avatar_url ? "Change picture" : "Upload a picture"}
              </button>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  className="h-9 rounded-mt-md px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {removing ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
            <p
              role={error ? "alert" : undefined}
              className={`text-xs ${error ? "text-mt-danger-fg" : "text-mt-text-subtle"}`}
            >
              {error ||
                `JPG, PNG or WebP, up to ${MAX_AVATAR_MB} MB. Without a picture we show your initials.`}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-mt-text-subtle">Loading…</p>
      )}

      {dialogOpen && <AvatarDialog onClose={() => setDialogOpen(false)} onSave={handleSave} />}
      {toast && <Toast message={toast} onClose={closeToast} />}
    </section>
  );
}
