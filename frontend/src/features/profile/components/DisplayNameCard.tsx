"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Toast } from "@/components/ui/Toast";
import { updateDisplayName } from "../api/profile";
import type { Profile } from "../api/profile";
import { useProfile } from "../ProfileProvider";
import { MAX_NAME_LENGTH, validateDisplayName } from "../validateDisplayName";

// Waits for the profile, then shows the form with the saved name filled in
export function DisplayNameCard() {
  const { profile, setProfile } = useProfile();

  return (
    <section
      aria-labelledby="display-name-title"
      className="flex flex-col gap-5 rounded-mt-xl border border-mt-border bg-mt-surface p-6"
    >
      <h2 id="display-name-title" className="text-[17px] font-semibold text-mt-text">
        Display name
      </h2>
      {profile ? (
        <DisplayNameForm profile={profile} onSaved={setProfile} />
      ) : (
        <p className="text-sm text-mt-text-subtle">Loading…</p>
      )}
    </section>
  );
}

interface DisplayNameFormProps {
  profile: Profile;
  onSaved: (profile: Profile) => void;
}

function DisplayNameForm({ profile, onSaved }: DisplayNameFormProps) {
  const name = profile.display_name ?? ""; // the saved name
  const [draft, setDraft] = useState(name); // what is in the text field
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false); // shows the "updated" message

  const trimmed = draft.trim();
  const dirty = trimmed !== name; // true when the field differs from the saved name
  const tooLong = trimmed.length > MAX_NAME_LENGTH;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateDisplayName(trimmed);
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    try {
      // Save in the database, then share the new profile so the sidebar updates too
      onSaved(await updateDisplayName(trimmed));
      setDraft(trimmed);
      setSaved(true);
    } catch {
      setError("Could not save your name. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setDraft(name);
    setError("");
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex max-w-[420px] flex-col gap-1.5">
          <label htmlFor="display-name" className="text-[13px] font-medium text-mt-text">
            Display name
          </label>
          <input
            id="display-name"
            value={draft}
            onChange={handleChange}
            autoComplete="name"
            maxLength={60}
            aria-invalid={error !== ""}
            aria-describedby="display-name-hint"
            className={`h-9 w-full rounded-mt-md border bg-mt-raised px-3 text-sm text-mt-text focus:outline-2 focus:outline-mt-accent ${
              error ? "border-mt-danger" : "border-mt-border-strong"
            }`}
          />
          <div className="flex justify-between gap-3 text-xs">
            <span
              id="display-name-hint"
              className={error ? "text-mt-danger-fg" : "text-mt-text-subtle"}
            >
              {error || "Shown next to your corrections and on shared manuscripts."}
            </span>
            <span className={`font-mono ${tooLong ? "text-mt-danger-fg" : "text-mt-text-subtle"}`}>
              {trimmed.length} / {MAX_NAME_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!dirty || saving}
            className="h-9 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {dirty && (
            <>
              <button
                type="button"
                onClick={handleDiscard}
                className="h-9 rounded-mt-md px-3.5 text-sm font-medium text-mt-text-muted hover:bg-mt-hover"
              >
                Discard
              </button>
              <span className="ml-2 text-xs text-mt-text-subtle">Unsaved changes</span>
            </>
          )}
        </div>
      </form>
      {saved && <Toast message="Display name updated" onClose={() => setSaved(false)} />}
    </>
  );
}
