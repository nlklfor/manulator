"use client";

import { useLibrary } from "../context/LibraryContext";
import { UploadDropzone } from "./UploadDropzone";
import { CompactUploadBar } from "./CompactUploadBar";
import { ManuscriptLibrary } from "./ManuscriptLibrary";
import { UploadConfirmDialog } from "./UploadConfirmDialog";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Toast } from "@/components/ui/Toast";
import { Search, Upload, X } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { useStatusFilter } from "../hooks/useStatusFilter";
import { folderOf, parseFolder } from "../constants/folders";
import { ACCEPTED_FILE_TYPES } from "../hooks/validateFile";
import type { UploadDetails } from "../api/uploadImage";

// ── Sort options ──────────────────────────────────────────────────────────────
type SortOption = "newest" | "oldest" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name (A–Z)",
};

// ── Steps shown on the empty-state screen ────────────────────────────────────
const STEPS = [
  { title: "Upload a scan", description: "One image per manuscript page." },
  { title: "Transcribe", description: "The HTR model reads it line by line." },
  { title: "Correct and export", description: "Fix uncertain words, then export TXT or PAGE XML." },
];

export function UploadPageCard() {
  const {
    libraryEntries,
    isLoading,
    loadError,
    uploadError,
    pendingFile,
    selectFile,
    confirmUpload,
    cancelUpload,
    removeManuscript,
    editManuscript,
  } = useLibrary();
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);

  // Sort state. The library keeps the newest page first (new uploads are added at the
  // front and the backend returns newest first), so "newest" keeps the order as it is.
  const [sort, setSort] = useState<SortOption>("newest");

  // Name search — filters by filename, stacked on top of sort + status filter
  const [nameQuery, setNameQuery] = useState("");

  // Hidden file input for the "Upload page" button in the header
  const headerInputRef = useRef<HTMLInputElement>(null);

  const hasEntries = libraryEntries.length > 0;

  // Folder chosen in the sidebar (?type=Charter). null = all manuscripts.
  const openFolder = parseFolder(useSearchParams().get("type"));
  const folderEntries = openFolder
    ? libraryEntries.filter((entry) => folderOf(entry.documentType) === openFolder)
    : libraryEntries;

  function handleDeleted(id: string, success: boolean, message: string) {
    if (success) {
      // Remove the manuscript from the library if deletion was successful
      removeManuscript(id);
    }
    setToast({ message, success });
  }

  // Called by the edit form. It throws when saving fails, so the form can show the error.
  async function handleEdit(id: string, details: UploadDetails) {
    await editManuscript(id, details);
    setToast({ message: "Changes saved", success: true });
  }

  // Stable function, so the Toast timer is not restarted on every render
  const closeToast = useCallback(() => setToast(null), []);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortedEntries = (() => {
    if (sort === "name")
      return [...folderEntries].sort((a, b) => a.fileName.localeCompare(b.fileName));
    if (sort === "oldest") return [...folderEntries].reverse();
    return [...folderEntries]; // "newest" = list order
  })();

  // ── Status filter ─────────────────────────────────────────────────────────
  // Pass sortedEntries so the hook filters the already-sorted list
  const { statusFilter, setStatusFilter, filterOptions, filteredEntries, activeFilterLabel } =
    useStatusFilter(sortedEntries);

  // ── Name search on top of sort + status filter ────────────────────────────
  const trimmed = nameQuery.trim().toLowerCase();
  const displayedEntries = trimmed
    ? filteredEntries.filter((e) => e.fileName.toLowerCase().includes(trimmed))
    : filteredEntries;

  return (
    <div className="mx-auto w-full max-w-5xl">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.success ? "success" : "error"}
          onClose={closeToast}
        />
      )}

      {pendingFile && (
        <UploadConfirmDialog
          key={pendingFile.name + pendingFile.lastModified}
          file={pendingFile}
          onConfirm={confirmUpload}
          onCancel={cancelUpload}
        />
      )}

      {/* ── Page header: title + sort dropdown + upload button ─────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-mt-text">{openFolder ?? "All pages"}</h1>
          <p className="mt-1 text-sm text-mt-text-muted">
            {hasEntries
              ? `${folderEntries.length} page${folderEntries.length === 1 ? "" : "s"}`
              : isLoading
                ? "Loading pages…"
                : "No pages yet"}
          </p>
        </div>

        {/* Sort + upload button — only when the library has pages */}
        {hasEntries && (
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <label htmlFor="sort" className="sr-only">
              Sort pages
            </label>
            <div className="relative">
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="h-9 w-44 cursor-pointer appearance-none rounded-mt-md border border-mt-border-strong bg-mt-raised pl-3 pr-8 text-sm text-mt-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-mt-accent"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((val) => (
                  <option key={val} value={val}>
                    {SORT_LABELS[val]}
                  </option>
                ))}
              </select>
              {/* Chevron icon */}
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mt-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            {/* Upload page button (opens the same confirm dialog as the dropzone) */}
            <input
              ref={headerInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) selectFile(file);
                e.target.value = ""; // reset so the same file can be re-selected
              }}
            />
            <button
              type="button"
              onClick={() => headerInputRef.current?.click()}
              className="flex h-9 items-center gap-2 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload page
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div className="mt-4 rounded-mt-md border border-mt-danger bg-mt-danger-bg px-4 py-3 text-sm text-mt-danger-fg">
          {loadError}
        </div>
      )}

      {uploadError && (
        <div className="mt-4 rounded-mt-md border border-mt-danger bg-mt-danger-bg px-4 py-3 text-sm text-mt-danger-fg">
          <span className="font-medium">Could not upload file: </span>
          {uploadError.message}
        </div>
      )}

      <div className="mt-6">
        {isLoading && !hasEntries ? null : hasEntries ? (
          <div className="space-y-4">
            <CompactUploadBar onFileSelected={selectFile} />

            {/* Name search input */}
            <div
              className={`flex items-center gap-3 rounded-mt-lg border bg-mt-raised px-4 shadow-sm transition-colors ${
                nameQuery ? "border-mt-border-strong" : "border-mt-border"
              } focus-within:border-mt-accent focus-within:outline focus-within:outline-2 focus-within:outline-mt-accent focus-within:-outline-offset-1`}
            >
              <Search className="h-4 w-4 shrink-0 text-mt-text-subtle" aria-hidden="true" />
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Search by filename…"
                aria-label="Search pages by filename"
                className="h-11 flex-1 border-0 bg-transparent text-sm text-mt-text placeholder:text-mt-text-subtle focus:outline-none"
              />
              {nameQuery && (
                <button
                  type="button"
                  onClick={() => setNameQuery("")}
                  aria-label="Clear search"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-mt-text-subtle transition-colors hover:bg-mt-hover hover:text-mt-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status filter chips */}
            <Segmented
              ariaLabel="Filter pages by status"
              options={filterOptions}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            {displayedEntries.length > 0 ? (
              <ManuscriptLibrary
                entries={displayedEntries}
                onDeleted={handleDeleted}
                onEdit={handleEdit}
              />
            ) : (
              <div className="rounded-mt-md border border-mt-border bg-mt-surface px-4 py-10 text-center">
                <p className="text-sm text-mt-text-muted">
                  {folderEntries.length === 0
                    ? `No manuscripts in "${openFolder}" yet`
                    : nameQuery && statusFilter !== "all"
                      ? `No "${activeFilterLabel}" pages match "${nameQuery}"`
                      : nameQuery
                        ? `No pages match "${nameQuery}"`
                        : `No pages with status "${activeFilterLabel}"`}
                </p>
                {folderEntries.length === 0 && (
                  <Link
                    href="/"
                    className="mt-3 inline-block text-sm font-medium text-mt-accent-text underline underline-offset-2 hover:text-mt-accent-hover"
                  >
                    Show all pages
                  </Link>
                )}
                {folderEntries.length > 0 && (nameQuery || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameQuery("");
                      setStatusFilter("all");
                    }}
                    className="mt-3 text-sm font-medium text-mt-accent-text underline underline-offset-2 hover:text-mt-accent-hover"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <UploadDropzone onFileSelected={selectFile} />
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-mt-border-strong text-xs font-medium text-mt-text-muted">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-mt-text">{step.title}</p>
                    <p className="text-sm text-mt-text-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
