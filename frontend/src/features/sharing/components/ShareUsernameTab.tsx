"use client";

import { useState, type SubmitEvent } from "react";
import TextField from "@/features/auth/components/TextField";
import { normalizeUsername } from "@/features/auth/username";
import { ApiError } from "@/lib/api/client";
import { shareWithUser } from "../api/shareWithUser";

interface ShareUsernameTabProps {
  manuscriptId: string;
  onShared: (username: string) => void; // the parent shows the toast and closes the dialog
}

// The message under the field for each answer of the backend
function shareErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "No user with this username";
    if (error.status === 400) return "You can't share with yourself";
    if (error.status === 409) return "Wait until transcription has finished";
  }
  return "Could not share. Please try again.";
}

// Share by typing the other person's username
export function ShareUsernameTab({ manuscriptId, onShared }: ShareUsernameTabProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeUsername(username.replace(/^@/, "")); // "@Bob" works too
    if (!name) {
      setError("Enter a username");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const result = await shareWithUser(manuscriptId, name);
      onShared(result.username);
    } catch (err) {
      setError(shareErrorMessage(err));
      setSending(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <TextField
        id="share-username"
        name="username"
        label="Username"
        placeholder="e.g. bob"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={username}
        onChange={(event) => {
          setUsername(event.target.value);
          setError(null);
        }}
        disabled={sending}
        error={error}
        hint="They get their own copy, with the transcription and corrections."
        autoFocus
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending}
          className="rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
