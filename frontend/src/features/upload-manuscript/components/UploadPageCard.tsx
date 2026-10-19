"use client";

import { useFileSelection } from "../hooks/useFileSelection";
import { UploadDropzone } from "./UploadDropzone";
import { CompactUploadBar } from "./CompactUploadBar";
import { ManuscriptLibrary } from "./ManuscriptLibrary";
import { useCallback, useRef, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { Search, Upload, X } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { useStatusFilter } from "../hooks/useStatusFilter";
import { ACCEPTED_FILE_TYPES } from "../hooks/validateFile";

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
    uploadError,
    pendingFile,
    selectFile,
    confirmUpload,
    cancelUpload,
    removeManuscript,
  } = useFileSelection();
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);

  // Sort state — entries are stored newest-last, so "newest" = reverse insertion order
  const [sort, setSort] = useState<SortOption>("newest");

  // Name search — filters by filename, stacked on top of sort + status filter
  const [nameQuery, setNameQuery] = useState("");

  // Hidden file input for the "Upload page" button in the header
  const headerInputRef = useRef<HTMLInputElement>(null);

  const hasEntries = libraryEntries.length > 0;

  function handleDeleted(id: string, success: boolean, message: string) {
    if (success) removeManuscript(id);
    setToast({ message, success });
  }

  // Stable callback so the Toast timer is not restarted on every render
  const closeToast = useCallback(() => setToast(null), []);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortedEntries = (() => {
    if (sort === "name")
      return [...libraryEntries].sort((a, b) => a.fileName.localeCompare(b.fileName));
    if (sort === "newest") return [...libraryEntries].reverse();
    return [...libraryEntries]; // "oldest" = insertion order
  })();

  // ── Status filter (Fabia's hook, PR #73) ─────────────────────────────────
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

      {/* ── Page header: title + sort dropdown + upload button ─────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-mt-text">All pages</h1>
          <p className="mt-1 text-sm text-mt-text-muted">
            {hasEntries
              ? `${libraryEntries.length} page${libraryEntries.length > 1 ? "s" : ""}`
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

            {/* Upload page button */}
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

      {uploadError && (
        <div className="mt-4 rounded-mt-md border border-mt-danger bg-mt-danger-bg px-4 py-3 text-sm text-mt-danger-fg">
          <span className="font-medium">Could not upload file: </span>
          {uploadError.message}
        </div>
      )}

      <div className="mt-6">
        {hasEntries ? (
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

            {/* Status filter chips — Fabia's Segmented component (PR #73) */}
            <Segmented
              ariaLabel="Filter pages by status"
              options={filterOptions}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            {displayedEntries.length > 0 ? (
              <ManuscriptLibrary entries={displayedEntries} onDeleted={handleDeleted} />
            ) : (
              <div className="rounded-mt-md border border-mt-border bg-mt-surface px-4 py-10 text-center">
                <p className="text-sm text-mt-text-muted">
                  {nameQuery && statusFilter !== "all"
                    ? `No "${activeFilterLabel}" pages match "${nameQuery}"`
                    : nameQuery
                      ? `No pages match "${nameQuery}"`
                      : `No pages with status "${activeFilterLabel}"`}
                </p>
                {(nameQuery || statusFilter !== "all") && (
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
