"use client";

import { useFileSelection } from "../hooks/useFileSelection";
import { UploadDropzone } from "./UploadDropzone";
import { CompactUploadBar } from "./CompactUploadBar";
import { ManuscriptLibrary } from "./ManuscriptLibrary";
import { useCallback, useRef, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { Search, Upload, X } from "lucide-react";
import type { UploadStatus } from "../types/upload";
import { ACCEPTED_FILE_TYPES } from "../hooks/validateFile";

// ── Sort options ───────────────────────────────────────────────────────────────
type SortOption = "newest" | "oldest" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name (A\u2013Z)",
};

// ── Status filter chips ────────────────────────────────────────────────────────
// "all" is a pseudo-status that shows every entry regardless of upload state
type StatusFilter = "all" | UploadStatus;

const STATUS_CHIPS: [StatusFilter, string][] = [
  ["all", "All"],
  ["uploading", "Uploading"],
  ["uploaded", "Uploaded"],
  ["upload-failed", "Upload failed"],
];

// ── Steps shown on the empty-state screen ─────────────────────────────────────
const STEPS = [
  { title: "Upload a scan", description: "One image per manuscript page." },
  { title: "Transcribe", description: "The HTR model reads it line by line." },
  {
    title: "Correct and export",
    description: "Fix uncertain words, then export TXT or PAGE XML.",
  },
];

export function UploadPageCard() {
  const { libraryEntries, uploadError, selectFile, removeManuscript } = useFileSelection();
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Name search: filters entries whose filename contains the query (case-insensitive)
  const [nameQuery, setNameQuery] = useState("");

  // Hidden input wired to the "Upload page" button in the header
  const headerInputRef = useRef<HTMLInputElement>(null);

  const hasEntries = libraryEntries.length > 0;

  function handleDeleted(id: string, success: boolean, message: string) {
    if (success) removeManuscript(id);
    setToast({ message, success });
  }

  // Stable callback so the Toast timer is not restarted on every render
  const closeToast = useCallback(() => setToast(null), []);

  // ── Sort ─────────────────────────────────────────────────────────────────────
  // Entries are appended newest-last, so reversing gives newest-first.
  const sortedEntries = (() => {
    if (sort === "name")
      return [...libraryEntries].sort((a, b) => a.fileName.localeCompare(b.fileName));
    if (sort === "newest") return [...libraryEntries].reverse();
    return [...libraryEntries]; // "oldest" = insertion order
  })();

  // ── Status filter ─────────────────────────────────────────────────────────────
  const statusFiltered =
    statusFilter === "all"
      ? sortedEntries
      : sortedEntries.filter((e) => e.status === statusFilter);

  // Apply name search on top of sort + status filter
  const trimmed = nameQuery.trim().toLowerCase();
  const displayedEntries = trimmed
    ? statusFiltered.filter((e) => e.fileName.toLowerCase().includes(trimmed))
    : statusFiltered;

  const countForStatus = (s: UploadStatus) => libraryEntries.filter((e) => e.status === s).length;

  return (
    <div className="flex flex-col">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.success ? "success" : "error"}
          onClose={closeToast}
        />
      )}

      {/* ── Page header: title + sort + upload button ────────────────────────── */}
      <header className="flex items-end justify-between gap-6 px-10 pb-5 pt-9">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em] text-mt-text">
            All pages
          </h1>
          <p className="text-sm text-mt-text-muted">
            {hasEntries
              ? `${libraryEntries.length} page${libraryEntries.length !== 1 ? "s" : ""}`
              : "No pages yet"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown — only visible when the library has pages */}
          {hasEntries && (
            <>
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
                {/* Chevron */}
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
            </>
          )}

          {/* "Upload page" button — only shown when there are already pages in the library.
               The empty state has its own Upload button inside the drop zone. */}
          {hasEntries && (
            <>
              <input
                ref={headerInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) selectFile(file);
                  e.target.value = ""; // reset so the same file can be picked again
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
            </>
          )}
        </div>
      </header>

      {/* ── Upload error banner ──────────────────────────────────────────────── */}
      {uploadError && (
        <div className="mx-10 mb-3 rounded-mt-md border border-mt-danger bg-mt-danger-bg px-4 py-3 text-sm text-mt-danger-fg">
          <span className="font-medium">Could not upload file: </span>
          {uploadError.message}
        </div>
      )}

      {hasEntries ? (
        <>
          {/* ── Compact drag-and-drop zone ──────────────────────────────────── */}
          <div className="px-10">
            <CompactUploadBar onFileSelected={selectFile} />
          </div>

          {/* ── Name search input ────────────────────────────────────────── */}
          <div className="px-10 pt-5">
            <div
              className={`flex items-center gap-3 rounded-mt-lg border bg-mt-raised px-4 py-0 shadow-sm transition-colors ${
                nameQuery
                  ? "border-mt-border-strong"
                  : "border-mt-border"
              } focus-within:border-mt-accent focus-within:outline focus-within:outline-2 focus-within:outline-mt-accent focus-within:-outline-offset-1`}
            >
              <Search className="h-4 w-4 shrink-0 text-mt-text-subtle" aria-hidden="true" />
              <input
                type="search"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Search by filename…"
                aria-label="Search pages by filename"
                className="h-11 flex-1 border-0 bg-transparent text-sm text-mt-text placeholder:text-mt-text-subtle focus:outline-none"
              />
              {/* Clear button — only shown when there is a query */}
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
          </div>

          {/* ── Status filter chips ────────────────────────────────────────── */}
          <div
            role="group"
            aria-label="Filter by status"
            className="flex flex-wrap gap-2 px-10 pb-5 pt-4"
          >
            {STATUS_CHIPS.map(([value, label]) => {
              const count = value === "all" ? libraryEntries.length : countForStatus(value);
              const isActive = statusFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setStatusFilter(value)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-mt-text bg-mt-text text-mt-bg"
                      : "border-mt-border text-mt-text-muted hover:bg-mt-hover hover:text-mt-text"
                  }`}
                >
                  {label}
                  <span className="font-mono text-xs opacity-75">{count}</span>
                </button>
              );
            })}
          </div>

          {/* ── Manuscript grid or no-match notice ────────────────────────── */}
          {displayedEntries.length > 0 ? (
            <div className="px-10 pb-12">
              <ManuscriptLibrary entries={displayedEntries} onDeleted={handleDeleted} />
            </div>
          ) : (
            <div className="px-10 py-12 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-mt-border-strong" aria-hidden="true" />
              <p className="text-sm font-medium text-mt-text">No pages found</p>
              <p className="mt-1 text-sm text-mt-text-muted">
                {nameQuery && statusFilter !== "all"
                  ? `No "${statusFilter}" pages match “${nameQuery}”`
                  : nameQuery
                  ? `No pages match “${nameQuery}”`
                  : `No pages with status “${STATUS_CHIPS.find(([v]) => v === statusFilter)?.[1]}”`}
              </p>
              {/* Help the user recover */}
              {(nameQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => { setNameQuery(""); setStatusFilter("all"); }}
                  className="mt-3 text-sm font-medium text-mt-accent-text underline underline-offset-2 hover:text-mt-accent-hover"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── Empty state ────────────────────────────────────────────────────── */
        <div className="flex flex-1 flex-col items-center px-10 pb-20 pt-4">
          <UploadDropzone onFileSelected={selectFile} />
          <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
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
        </div>
      )}
    </div>
  );
}
