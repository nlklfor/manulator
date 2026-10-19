"use client";
// WorkspacePage — the manuscript detail / editing view.
// Renders a two-panel layout: image viewer (left) + transcription pane (right).
// State is read from LibraryContext (persisted across navigation at the dashboard
// layout level). Transcription data is simulated locally for now; once the backend
// exposes GET /upload-manuscripts/{id}/transcription it can replace the mock.
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ScanLine,
  Check,
  X,
} from "lucide-react";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { StatusBadge } from "@/features/upload-manuscript/components/StatusBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranscriptionLine {
  n: number; // line number (1-based)
  text: string; // current text (edited or original)
  confidence: number; // 0-100
  lowConfWords: number[]; // indices of words with confidence < 75
}

// ---------------------------------------------------------------------------
// Mock transcription data (shown after a successful "Transcribe" action)
// ---------------------------------------------------------------------------
// Available HTR models — the ML team wires up the real call in handleTranscribe.
const HTR_MODELS = [
  { id: "default", label: "Default model" },
  { id: "latin-medieval", label: "Latin medieval" },
  { id: "carolingian", label: "Carolingian minuscule" },
  { id: "gothic", label: "Gothic cursive" },
] as const;

type HtrModelId = (typeof HTR_MODELS)[number]["id"];

// ---------------------------------------------------------------------------
// WorkspacePage
// ---------------------------------------------------------------------------

interface WorkspacePageProps {
  manuscriptId: string;
}

export function WorkspacePage({ manuscriptId }: WorkspacePageProps) {
  const { libraryEntries, updateEntryStatus } = useLibrary();
  const entry = libraryEntries.find((e) => e.id === manuscriptId);

  // --- Image viewer state ---
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null,
  );
  const movedRef = useRef(false);

  // --- Transcription state ---
  const [lines, setLines] = useState<TranscriptionLine[]>([]);
  const [editingLine, setEditingLine] = useState<number | null>(null); // index in lines
  const [editDraft, setEditDraft] = useState("");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [lineFilter, setLineFilter] = useState<"all" | "review">("all");
  // --- Model selector ---
  const [selectedModel, setSelectedModel] = useState<HtrModelId>("default");

  // --- Export dialog ---
  const [showExport, setShowExport] = useState(false);
  const [exportFmt, setExportFmt] = useState<"txt" | "xml">("txt");

  // --- Toast ---
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback(
    (msg: string) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast(msg);
      toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    },
    [setToast],
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleTranscribe() {
    if (!entry) return;
    setLines([]);
    setSelectedLine(null);
    setEditingLine(null);
    // TODO: call the real transcription API with entry.id and selectedModel
    // e.g. transcribeManuscript(entry.id, selectedModel).then(result => setLines(result.lines))
    updateEntryStatus(entry.id, "transcribing");
  }

  function handleReTranscribe() {
    setLines([]);
    setSelectedLine(null);
    setEditingLine(null);
    setLineFilter("all");
    handleTranscribe();
  }

  function commitEdit(idx: number) {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, text: trimmed, lowConfWords: [], confidence: 100 } : l,
      ),
    );
    // If all low-conf words are now corrected, mark as corrected
    if (entry) updateEntryStatus(entry.id, "corrected");
    setEditingLine(null);
    setSelectedLine(idx);
    showToast("Line saved");
  }

  function cancelEdit() {
    setEditingLine(null);
    if (selectedLine != null) setSelectedLine(selectedLine);
  }

  // ---------------------------------------------------------------------------
  // Image viewer handlers
  // ---------------------------------------------------------------------------

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    movedRef.current = false;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!movedRef.current && Math.abs(dx) + Math.abs(dy) < 4) return;
    movedRef.current = true;
    setIsDragging(true);
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }

  function handlePointerUp() {
    dragRef.current = null;
    setIsDragging(false);
  }

  function handleZoomIn() {
    setZoom((z) => Math.min(4, Math.round(z * 125) / 100));
  }

  function handleZoomOut() {
    setZoom((z) => Math.max(0.25, Math.round((z / 1.25) * 100) / 100));
  }

  function handleFit() {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const status = entry?.status ?? "uploaded";
  const isUploaded = status === "uploaded";
  const isTranscribing = status === "transcribing";
  const isTranscribed = status === "transcribed" || status === "corrected";

  const lowConfLineIdxs = lines.reduce<number[]>((acc, l, i) => {
    if (l.lowConfWords.length > 0) acc.push(i);
    return acc;
  }, []);

  const visibleLines =
    lineFilter === "review" ? lines.filter((_, i) => lowConfLineIdxs.includes(i)) : lines;

  const reviewCount = lowConfLineIdxs.length;
  const reviewDone = lineFilter === "review" && visibleLines.length === 0;

  // ---------------------------------------------------------------------------
  // "Not found" state
  // ---------------------------------------------------------------------------

  if (!entry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-lg font-semibold text-mt-text">Manuscript not found</p>
        <p className="text-sm text-mt-text-muted">
          This page may have been deleted or the link is invalid.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-mt-accent-text underline underline-offset-4"
        >
          ← Back to Library
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-mt-bg">
      {/* ------------------------------------------------------------------ */}
      {/* Topbar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-mt-border bg-mt-surface px-4">
        {/* Brand logo — clicking it returns to the library */}
        <Link
          href="/"
          aria-label="manulator — back to library"
          className="flex shrink-0 items-center gap-2 text-mt-text no-underline"
        >
          {/* Logo placeholder matches the design spec */}
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-dashed border-mt-border-strong font-mono text-[8px] uppercase tracking-wide text-mt-text-subtle">
            logo
          </span>
          <span className="text-[17px] font-semibold leading-none tracking-tight text-mt-text">
            manulator
          </span>
        </Link>

        {/* Divider */}
        <span className="h-6 w-px shrink-0 bg-mt-border" aria-hidden="true" />

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm text-mt-text-subtle"
        >
          <Link href="/" className="hover:text-mt-text hover:underline">
            Library
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[200px] truncate font-semibold text-mt-text">
            {entry.fileName}
          </span>
        </nav>

        {/* Status badge */}
        <StatusBadge status={status} />

        <div className="flex-1" />

        {/* Save indicator (only when transcribed/corrected) */}
        {isTranscribed && (
          <span className="flex items-center gap-1.5 text-xs text-mt-text-subtle">
            <Check className="h-3.5 w-3.5 text-mt-success-fg" aria-hidden="true" />
            All changes saved
          </span>
        )}

        {/* Action buttons */}

        {isUploaded && (
          <button
            type="button"
            onClick={handleTranscribe}
            className="btn btn-primary inline-flex h-9 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Transcribe
          </button>
        )}
        {isTranscribing && (
          <button
            type="button"
            disabled
            className="inline-flex h-9 min-w-[160px] cursor-progress items-center justify-center gap-2 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg opacity-80"
          >
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent"
              aria-hidden="true"
            />
            Transcribing…
          </button>
        )}
        {isTranscribed && (
          <button
            type="button"
            onClick={handleReTranscribe}
            className="inline-flex h-9 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Re-transcribe
          </button>
        )}
        {/* Export — always visible; disabled until a transcription exists */}
        <button
          type="button"
          disabled={!isTranscribed}
          onClick={() => isTranscribed && setShowExport(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </button>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main: image viewer + transcription pane                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Image viewer */}
        <section
          aria-label="Page image"
          className="flex w-[56%] shrink-0 flex-col border-r border-mt-border"
        >
          {/* Image toolbar */}
          <div
            role="toolbar"
            aria-label="Image tools"
            className="flex h-12 shrink-0 items-center gap-1.5 border-b border-mt-border bg-mt-surface px-3"
          >
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              className="inline-flex h-8 w-8 items-center justify-center rounded-mt-md text-mt-text-muted hover:bg-mt-hover hover:text-mt-text"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[48px] text-center font-mono text-xs text-mt-text-muted">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              className="inline-flex h-8 w-8 items-center justify-center rounded-mt-md text-mt-text-muted hover:bg-mt-hover hover:text-mt-text"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleFit}
              className="inline-flex h-8 items-center gap-1.5 rounded-mt-md px-2.5 text-xs text-mt-text-muted hover:bg-mt-hover hover:text-mt-text"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Fit
            </button>
            <div className="flex-1" />
            <span className="text-xs text-mt-text-subtle">Drag to pan</span>
          </div>

          {/* Viewport */}
          <div
            className={`relative min-h-0 flex-1 overflow-hidden bg-mt-sunken ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Scan image (transformed) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              {entry.fileType === "application/pdf" ? (
                <div className="flex h-[520px] w-[390px] items-center justify-center rounded-lg bg-mt-surface text-mt-text-subtle shadow-md">
                  <p className="text-sm">PDF preview not available</p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.previewUrl}
                  alt={entry.fileName}
                  draggable={false}
                  className="block max-h-[520px] max-w-[390px] select-none rounded-lg object-contain shadow-md"
                />
              )}
            </div>

            {/* Folio info chip */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-mt-raised px-3 py-1 font-mono text-xs text-mt-text-muted shadow">
              {entry.fileName}
            </div>
          </div>
        </section>

        {/* Right: Transcription pane */}
        <section aria-label="Transcription" className="flex min-w-0 flex-1 flex-col bg-mt-surface">
          {/* Pane header */}
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-mt-border px-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-semibold text-mt-text">Transcription</h2>
              <span className="text-xs text-mt-text-subtle">
                {isTranscribed
                  ? `${lines.length} lines · ${reviewCount ? `${reviewCount} words to review` : "all reviewed"}`
                  : isTranscribing
                    ? "Working…"
                    : "No text yet"}
              </span>
            </div>
            {/* Filter tabs (only when transcribed) */}
            {isTranscribed && (
              <div
                role="group"
                aria-label="Which lines to show"
                className="flex gap-0.5 rounded-mt-md bg-mt-sunken p-0.5"
              >
                {(["all", "review"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={lineFilter === f}
                    onClick={() => setLineFilter(f)}
                    className={`h-7 rounded px-2.5 text-xs font-medium transition-colors ${
                      lineFilter === f
                        ? "bg-mt-raised text-mt-text shadow-sm"
                        : "text-mt-text-muted hover:text-mt-text"
                    }`}
                  >
                    {f === "all" ? "All lines" : `Needs review `}
                    {f === "review" && (
                      <span className="ml-1 font-mono text-[10px] opacity-75">{reviewCount}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ---- Uploaded state: empty ---- */}
          {isUploaded && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mt-accent-soft text-mt-accent-text">
                <ScanLine className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1.5 items-center">
                <h3 className="text-lg font-semibold text-mt-text">Not transcribed yet</h3>
                <p className="max-w-xs text-sm text-mt-text-muted">
                  Run handwriting recognition to find the lines of text on this page and turn them
                  into an editable transcription.
                </p>
              </div>
              {/* Recognition model selector — lives here so the user picks the model before transcribing */}
              <div className="flex w-full max-w-[280px] flex-col gap-1.5">
                <label htmlFor="htr-model-panel" className="text-sm font-medium text-mt-text">
                  Recognition model
                </label>
                <div className="relative">
                  <select
                    id="htr-model-panel"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as HtrModelId)}
                    className="h-10 w-full cursor-pointer appearance-none rounded-mt-md border border-mt-border-strong bg-mt-surface pl-3 pr-9 text-sm text-mt-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-mt-accent"
                  >
                    {HTR_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
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
              </div>
              <button
                type="button"
                onClick={handleTranscribe}
                className="inline-flex h-10 items-center gap-2 rounded-mt-md bg-mt-accent px-5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
              >
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                Transcribe page
              </button>
              <p className="text-xs text-mt-text-subtle">Every line stays editable afterwards.</p>
            </div>
          )}

          {/* ---- Transcribing state: waiting for backend ---- */}
          {isTranscribing && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span
                className="h-7 w-7 animate-spin rounded-full border-2 border-mt-accent border-r-transparent"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-mt-text">Transcribing…</p>
              <p className="text-xs text-mt-text-subtle">
                Waiting for the HTR model to return results.
              </p>
            </div>
          )}

          {/* ---- Transcribed / Corrected state: line list ---- */}
          {isTranscribed && (
            <>
              {reviewDone ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                  <Check className="h-8 w-8 text-mt-success-fg" aria-hidden="true" />
                  <strong className="text-sm font-semibold text-mt-text">
                    Nothing left to review
                  </strong>
                  <span className="text-xs text-mt-text-muted">
                    Every uncertain word on this page has been checked.
                  </span>
                </div>
              ) : (
                <ol
                  className="flex flex-1 flex-col gap-0.5 overflow-auto p-2"
                  aria-label="Transcribed lines"
                >
                  {visibleLines.map((line) => {
                    const globalIdx = lines.findIndex((l) => l.n === line.n);
                    const isEditing = editingLine === globalIdx;
                    const isSelected = selectedLine === globalIdx;
                    return (
                      <li
                        key={line.n}
                        className={`grid grid-cols-[36px_1fr] items-start rounded-mt-md ${
                          isEditing
                            ? "bg-mt-raised shadow-[inset_0_0_0_2px_var(--mt-accent)]"
                            : isSelected
                              ? "bg-mt-accent-soft shadow-[inset_0_0_0_1px_var(--mt-accent-soft-strong)]"
                              : "hover:bg-mt-hover"
                        }`}
                        onMouseEnter={() => !isEditing && setSelectedLine(globalIdx)}
                      >
                        {/* Line number */}
                        <span
                          className={`py-2 pr-2 text-right font-mono text-[10px] ${
                            isEditing || isSelected ? "text-mt-accent-text" : "text-mt-text-subtle"
                          }`}
                        >
                          {line.n}
                        </span>

                        {/* View mode */}
                        {!isEditing && (
                          <button
                            type="button"
                            className="block w-full cursor-pointer rounded-mt-md py-2 pl-1 pr-3 text-left text-[15px] leading-7 text-mt-text"
                            style={{ fontFamily: "var(--mt-font-text, Georgia, serif)" }}
                            onClick={() => {
                              if (selectedLine === globalIdx) {
                                setEditingLine(globalIdx);
                                setEditDraft(line.text);
                              } else {
                                setSelectedLine(globalIdx);
                              }
                            }}
                            onDoubleClick={() => {
                              setEditingLine(globalIdx);
                              setEditDraft(line.text);
                            }}
                          >
                            {/* Render words, marking low-confidence ones */}
                            {line.text.split(" ").map((word, wi, arr) => (
                              <span
                                key={wi}
                                className={
                                  line.lowConfWords.includes(wi)
                                    ? "underline decoration-dotted decoration-[#B04A12] underline-offset-4"
                                    : ""
                                }
                              >
                                {word}
                                {wi < arr.length - 1 ? " " : ""}
                              </span>
                            ))}
                            {/* Show meta hint when selected */}
                            {isSelected && (
                              <span className="ml-2 text-[11px] text-mt-text-subtle">
                                {line.confidence}% confidence
                                {line.lowConfWords.length > 0
                                  ? ` · ${line.lowConfWords.length} uncertain · press Enter to correct`
                                  : " · press Enter to edit"}
                              </span>
                            )}
                          </button>
                        )}

                        {/* Edit mode */}
                        {isEditing && (
                          <div className="flex flex-col gap-1.5 py-1.5 pl-1 pr-3">
                            <label className="sr-only">Edit line {line.n}</label>
                            <input
                              autoFocus
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitEdit(globalIdx);
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelEdit();
                                }
                              }}
                              onBlur={() => commitEdit(globalIdx)}
                              spellCheck={false}
                              autoComplete="off"
                              className="w-full bg-transparent text-[15px] leading-7 text-mt-text outline-none"
                              style={{ fontFamily: "var(--mt-font-text, Georgia, serif)" }}
                            />
                            <p className="flex gap-3 text-[11px] text-mt-text-subtle">
                              <span>
                                <kbd className="rounded border border-mt-border-strong px-1 font-mono text-[10px]">
                                  Enter
                                </kbd>{" "}
                                Save
                              </span>
                              <span>
                                <kbd className="rounded border border-mt-border-strong px-1 font-mono text-[10px]">
                                  Esc
                                </kbd>{" "}
                                Cancel
                              </span>
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              {/* Footer: keyboard shortcuts */}
              <div className="flex h-10 shrink-0 items-center gap-3 border-t border-mt-border px-4 text-[11px] text-mt-text-subtle">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-mt-border-strong px-1 font-mono text-[10px]">
                    ↑
                  </kbd>
                  <kbd className="rounded border border-mt-border-strong px-1 font-mono text-[10px]">
                    ↓
                  </kbd>
                  Move
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-mt-border-strong px-1 font-mono text-[10px]">
                    Enter
                  </kbd>
                  Edit / save
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-mt-border-strong px-1 font-mono text-[10px]">
                    Esc
                  </kbd>
                  Cancel
                </span>
                <span className="ml-auto">
                  <span className="underline decoration-dotted decoration-[#B04A12] underline-offset-4">
                    word
                  </span>{" "}
                  uncertain, hover for confidence
                </span>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Export dialog                                                       */}
      {/* ------------------------------------------------------------------ */}
      {showExport && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowExport(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
            className="w-[480px] overflow-hidden rounded-mt-xl border border-mt-border bg-mt-raised shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <div>
                <h2 id="export-title" className="text-lg font-semibold text-mt-text">
                  Export transcription
                </h2>
                <p className="mt-0.5 text-xs text-mt-text-muted">
                  {entry.fileName} · {lines.length} lines
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowExport(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-mt-md text-mt-text-muted hover:bg-mt-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 px-6 py-4">
              {/* Format selection */}
              <fieldset className="flex flex-col gap-2.5 border-0 p-0">
                <legend className="mb-1 text-xs font-medium text-mt-text">Format</legend>
                {(["txt", "xml"] as const).map((fmt) => (
                  <label
                    key={fmt}
                    className={`flex cursor-pointer gap-3 rounded-mt-lg border p-3.5 text-sm ${
                      exportFmt === fmt
                        ? "border-mt-accent bg-mt-accent-soft shadow-[inset_0_0_0_1px_var(--mt-accent)]"
                        : "border-mt-border-strong bg-mt-raised hover:bg-mt-hover"
                    }`}
                  >
                    <input
                      type="radio"
                      name="export-fmt"
                      value={fmt}
                      checked={exportFmt === fmt}
                      onChange={() => setExportFmt(fmt)}
                      className="mt-0.5 accent-mt-accent"
                    />
                    <span>
                      <span className="font-semibold">
                        {fmt === "txt" ? "Plain text" : "PAGE XML"}
                      </span>
                      <span className="ml-1 font-mono text-xs text-mt-text-subtle">.{fmt}</span>
                      <br />
                      <span className="text-xs text-mt-text-muted">
                        {fmt === "txt"
                          ? "One transcribed line per row. For reading, quoting and full-text search."
                          : "Text plus line coordinates and confidence scores. Opens in Transkribus, eScriptorium and other HTR tools."}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {/* Preview */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-mt-text">Preview</p>
                <pre className="h-20 overflow-hidden rounded-mt-md bg-mt-sunken px-3.5 py-3 font-mono text-[11px] leading-[18px] text-mt-text-muted">
                  {exportFmt === "txt"
                    ? lines
                        .slice(0, 4)
                        .map((l) => l.text)
                        .join("\n") + "\n…"
                    : `<Page imageFilename="${entry.fileName}">
  <TextLine id="r1l1">
    <TextEquiv conf="0.94"><Unicode>${lines[0]?.text ?? ""}</Unicode>
  </TextLine>
  …`}
                </pre>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-mt-border bg-mt-surface px-6 py-3.5">
              <span className="mr-auto font-mono text-[11px] text-mt-text-subtle">
                {entry.fileName.replace(/\.[^.]+$/, "")}.{exportFmt}
              </span>
              <button
                type="button"
                onClick={() => setShowExport(false)}
                className="h-9 rounded-mt-md border border-mt-border-strong bg-mt-raised px-4 text-sm font-medium text-mt-text hover:bg-mt-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExport(false);
                  showToast(`Downloaded ${entry.fileName.replace(/\.[^.]+$/, "")}.${exportFmt}`);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-mt-md bg-mt-accent px-4 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Toast                                                               */}
      {/* ------------------------------------------------------------------ */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-mt-lg bg-[#2A251D] px-4 py-2.5 text-sm text-[#F4EEE3] shadow-xl"
        >
          <Check className="h-4 w-4 text-[#8FCBA3]" aria-hidden="true" />
          {toast}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast(null)}
            className="ml-1 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
