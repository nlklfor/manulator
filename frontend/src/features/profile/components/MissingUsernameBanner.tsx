"use client";

import { AtSign } from "lucide-react";
import { useProfile } from "../ProfileProvider";

// Asks accounts created before sharing existed to choose a username.
// Hidden while loading and once a username is saved.
export function MissingUsernameBanner() {
  const { profile } = useProfile();
  if (!profile || profile.username) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-mt-lg border border-mt-border bg-mt-accent-soft px-4 py-3 text-sm text-mt-text"
    >
      <AtSign className="mt-0.5 size-4 shrink-0 text-mt-text-muted" aria-hidden="true" />
      <p>
        <span className="font-medium">Choose a username</span> so other people can share manuscripts
        with you. You can set it in the Username section below.
      </p>
    </div>
  );
}
