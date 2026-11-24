"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  type CreatedShareLink,
  type ShareLink,
} from "../api/shareLinks";

const COPIED_MS = 2000;

interface ShareLinkTabProps {
  manuscriptId: string;
}

// e.g. "23 Nov, 14:05"
function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Share by link: create a link (valid 24 h), copy it, see and revoke the active ones
export function ShareLinkTab({ manuscriptId }: ShareLinkTabProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [created, setCreated] = useState<CreatedShareLink | null>(null); // the url is only known now
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listShareLinks(manuscriptId)
      .then((active) => {
        if (!cancelled) setLinks(active);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your links.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [manuscriptId]);

  // "Copied ✓" goes back to "Copy" after 2 seconds
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const link = await createShareLink(manuscriptId);
      setCreated(link);
      setCopied(false);
      const listed = { ...link, created_at: new Date().toISOString(), use_count: 0 };
      setLinks((current) => [listed, ...current]);
    } catch {
      setError("Could not create a link. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
    } catch {
      setError("Could not copy. Select the link and copy it by hand.");
    }
  }

  async function handleRevoke(linkId: string) {
    setRevokingId(linkId);
    setError(null);
    try {
      await revokeShareLink(linkId);
      setLinks((current) => current.filter((link) => link.id !== linkId));
      if (created?.id === linkId) setCreated(null);
    } catch {
      setError("Could not revoke the link. Please try again.");
    } finally {
      setRevokingId(null);
    }
  }

  // A link that expired while the dialog was open is hidden too
  const activeLinks = links.filter((link) => new Date(link.expires_at) > new Date());

  return (
    <div className="space-y-5">
      {created ? (
        <div className="space-y-2">
          <label htmlFor="share-link-url" className="block text-sm font-medium text-mt-text">
            Link
          </label>
          <div className="flex gap-2">
            <input
              id="share-link-url"
              readOnly
              value={created.url}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3 py-2 text-sm text-mt-text"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-mt-md bg-mt-accent px-3 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-mt-text-muted">Expires in 24 h</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-mt-text-muted">
            Anyone with the link can add a copy to their library for the next 24 hours.
          </p>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LinkIcon className="size-4" aria-hidden="true" />
            {creating ? "Creating…" : "Create link"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-mt-danger-fg">
          {error}
        </p>
      )}

      <section aria-labelledby="active-links-title" className="space-y-2">
        <h3 id="active-links-title" className="text-sm font-medium text-mt-text">
          Active links
        </h3>
        {loading ? (
          <p className="text-sm text-mt-text-subtle">Loading…</p>
        ) : activeLinks.length === 0 ? (
          <p className="text-sm text-mt-text-subtle">No active links.</p>
        ) : (
          <ul className="divide-y divide-mt-border rounded-mt-md border border-mt-border">
            {activeLinks.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-mt-text">
                  Expires {formatExpiry(link.expires_at)}
                  {link.use_count > 0 && (
                    <span className="text-mt-text-subtle"> · used {link.use_count}×</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRevoke(link.id)}
                  disabled={revokingId === link.id}
                  className="rounded-mt-md px-2.5 py-1 text-sm font-medium text-mt-danger-fg hover:bg-mt-danger-bg disabled:opacity-60"
                >
                  {revokingId === link.id ? "Revoking…" : "Revoke"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
