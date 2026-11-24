"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Link2Off } from "lucide-react";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { ApiError } from "@/lib/api/client";
import {
  acceptShareLink,
  previewShareLink,
  type ShareLinkPreview as Preview,
} from "../api/shareLinks";

// The backend gives the same 404 for expired, revoked, deleted and unknown links
const LINK_GONE = "This link is no longer available";

function linkErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.status === 404 ? LINK_GONE : fallback;
}

// What the recipient sees when they open a share link, with "Add to my library"
export function ShareLinkPreview({ token }: { token: string }) {
  const router = useRouter();
  const { reloadLibrary } = useLibrary();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewShareLink(token)
      .then((loaded) => {
        if (!cancelled) setPreview(loaded);
      })
      .catch((err) => {
        if (!cancelled)
          setError(linkErrorMessage(err, "Could not open the link. Please try again."));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAdd() {
    setAdding(true);
    setError(null);
    try {
      const { id } = await acceptShareLink(token);
      // The library is loaded once per visit, so load it again to include the copy
      await reloadLibrary();
      router.push(`/manuscript/${id}`);
    } catch (err) {
      setError(linkErrorMessage(err, "Could not add the manuscript. Please try again."));
      setAdding(false);
    }
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-6 pt-24">
      <section
        aria-labelledby="share-preview-title"
        aria-busy={!preview && !error}
        className="w-full max-w-md rounded-mt-xl border border-mt-border bg-mt-surface p-6"
      >
        {!preview && !error && <p className="text-sm text-mt-text-subtle">Loading…</p>}

        {!preview && error && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Link2Off className="size-8 text-mt-text-subtle" aria-hidden="true" />
            <h1 id="share-preview-title" className="text-lg font-semibold text-mt-text">
              {error}
            </h1>
            <Link href="/" className="text-sm text-mt-text underline underline-offset-2">
              Go to your library
            </Link>
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 size-5 shrink-0 text-mt-text-muted" aria-hidden="true" />
              <div className="min-w-0">
                <h1
                  id="share-preview-title"
                  className="truncate text-lg font-semibold text-mt-text"
                >
                  {preview.title}
                </h1>
                <p className="text-sm text-mt-text-muted">
                  {preview.document_type} · {preview.page_count}{" "}
                  {preview.page_count === 1 ? "page" : "pages"}
                </p>
                {preview.shared_by_username && (
                  <p className="mt-1 text-sm text-mt-text-muted">
                    Shared by <span className="font-medium">@{preview.shared_by_username}</span>
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-mt-danger-fg">
                {error}
              </p>
            )}

            {preview.is_owner ? (
              <p className="rounded-mt-md bg-mt-raised px-3 py-2 text-sm text-mt-text">
                This is your manuscript
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={adding}
                className="rounded-mt-md bg-mt-accent px-4 py-2.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {adding ? "Adding…" : "Add to my library"}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
