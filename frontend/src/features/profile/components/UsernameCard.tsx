"use client";

import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { Toast } from "@/components/ui/Toast";
import UsernameRequirements from "@/features/auth/components/UsernameRequirements";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_TAKEN_MESSAGE,
  normalizeUsername,
  validateUsername,
} from "@/features/auth/username";
import { ProfileRequestError, updateUsername } from "../api/profile";
import type { Profile } from "../api/profile";
import { useProfile } from "../ProfileProvider";

// The username other people share manuscripts with. Works like DisplayNameCard.
export function UsernameCard() {
  const { profile, setProfile } = useProfile();

  return (
    <section
      aria-labelledby="username-title"
      className="flex flex-col gap-5 rounded-mt-xl border border-mt-border bg-mt-surface p-6"
    >
      <h2 id="username-title" className="text-[17px] font-semibold text-mt-text">
        Username
      </h2>
      {profile ? (
        <UsernameForm profile={profile} onSaved={setProfile} />
      ) : (
        <p className="text-sm text-mt-text-subtle">Loading…</p>
      )}
    </section>
  );
}

interface UsernameFormProps {
  profile: Profile;
  onSaved: (profile: Profile) => void;
}

function UsernameForm({ profile, onSaved }: UsernameFormProps) {
  const saved = profile.username ?? ""; // the saved username
  const [draft, setDraft] = useState(saved); // what is in the text field
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false); // shows the "updated" message

  const normalized = normalizeUsername(draft);
  const dirty = normalized !== saved;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
    setError("");
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateUsername(normalized);
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    try {
      onSaved(await updateUsername(normalized));
      setDraft(normalized);
      setDone(true);
    } catch (err) {
      // A taken name keeps the old one: the database refused the change
      setError(
        err instanceof ProfileRequestError && err.status === 409
          ? USERNAME_TAKEN_MESSAGE
          : "Could not save your username. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setDraft(saved);
    setError("");
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex max-w-[420px] flex-col gap-1.5">
          <label htmlFor="username" className="text-[13px] font-medium text-mt-text">
            Username
          </label>
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-sm text-mt-text-subtle">
              @
            </span>
            <input
              id="username"
              value={draft}
              onChange={handleChange}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={USERNAME_MAX_LENGTH + 10}
              aria-invalid={error !== ""}
              aria-describedby="username-rules username-hint"
              className={`h-9 w-full rounded-mt-md border bg-mt-raised px-3 text-sm text-mt-text focus:outline-2 focus:outline-mt-accent ${
                error ? "border-mt-danger" : "border-mt-border-strong"
              }`}
            />
          </div>
          <UsernameRequirements id="username-rules" username={draft} />
          <span
            id="username-hint"
            className={`text-xs ${error ? "text-mt-danger-fg" : "text-mt-text-subtle"}`}
          >
            {error || "Other users type this name to share a manuscript with you."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!dirty || saving}
            className="h-9 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? "Saving…" : "Save username"}
          </button>
          {dirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="h-9 rounded-mt-md px-3.5 text-sm font-medium text-mt-text-muted hover:bg-mt-hover"
            >
              Discard
            </button>
          )}
        </div>
      </form>
      {done && <Toast message="Username updated" onClose={() => setDone(false)} />}
    </>
  );
}
